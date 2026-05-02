package vkapp

import (
	"backend/config"
	"backend/database"
	"backend/models"
	s3client "backend/s3"
	"backend/utils"
	"backend/vk"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type vkLaunchContext struct {
	UserID    int
	GroupID   int
	GroupRole string
}

type postResponse struct {
	ID          int           `json:"id"`
	Title       string        `json:"title"`
	Message     string        `json:"message"`
	Status      string        `json:"status"`
	VKPostID    int           `json:"vk_post_id,omitempty"`
	Group       *groupSummary `json:"group,omitempty"`
	Author      *userSummary  `json:"author,omitempty"`
	PublishDate    *string         `json:"publish_date,omitempty"`
	Attachments    string          `json:"attachments,omitempty"`
	S3VideoKey     string          `json:"s3_video_key,omitempty"`
	RejectReason   string          `json:"reject_reason,omitempty"`
	AttachmentURLs []AttachmentURL `json:"attachment_urls,omitempty"`
	CreatedAt      string          `json:"created_at"`
	UpdatedAt      string          `json:"updated_at"`
}

type AttachmentURL struct {
	ID   string `json:"id"`
	Type string `json:"type"`
	URL  string `json:"url"`
}

type groupSummary struct {
	ID         int    `json:"id"`
	VKGroupID  int    `json:"vk_group_id"`
	Name       string `json:"name"`
	ScreenName string `json:"screen_name"`
	Photo200   string `json:"photo_200"`
}

type groupSettingsResponse struct {
	ID         int    `json:"id"`
	VKGroupID  int    `json:"vk_group_id"`
	Name       string `json:"name"`
	ScreenName string `json:"screen_name"`
	Photo200   string `json:"photo_200"`
	CityID     *int   `json:"city_id"`
	CityTitle  *string `json:"city_title"`
	IsActive   bool   `json:"is_active"`
	HasToken   bool   `json:"has_token"`
	NotifyUserIDs []int  `json:"notify_user_ids"`
}

type userSummary struct {
	ID        int    `json:"id"`
	VKUserID  int    `json:"vk_user_id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Photo200  string `json:"photo_200"`
	Role      string `json:"role"`
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	utils.RespondSuccess(w, map[string]string{
		"status":  "ok",
		"service": "vk-app",
	})
}

func configHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.RespondError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	cfg := config.Load()
	utils.RespondSuccess(w, map[string]interface{}{
		"vk_mini_app_id":          cfg.VKMiniAppID,
		"vk_mini_app_service_key": cfg.VKMiniAppServiceKey,
		"vk_client_id":            cfg.VKClientID, // Для постинга через API
	})
}

func syncUserHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.RespondError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	ctx, err := parseLaunchContext(r)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	if ctx.UserID == 0 {
		utils.RespondError(w, http.StatusBadRequest, "vk_user_id is required")
		return
	}

	q := r.URL.Query()
	user, err := upsertUser(ctx.UserID, q.Get("firstName"), q.Get("lastName"), q.Get("photo200"))
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Фиксируем установку приложения в сообществе:
	// как только Mini App запущен с vk_group_id, создаем/актуализируем группу в БД.
	if ctx.GroupID != 0 {
		if _, err := ensureGroup(ctx.GroupID); err != nil {
			utils.RespondError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	utils.RespondSuccess(w, map[string]interface{}{
		"user":       userToSummary(user),
		"viewerRole": ctx.GroupRole,
		"groupId":    ctx.GroupID,
	})
}

func postsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		listPostsHandler(w, r)
	case http.MethodPost:
		createPostHandler(w, r)
	default:
		utils.RespondError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func videoUploadUrlHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.RespondError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	ctx, err := parseLaunchContext(r)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	if ctx.GroupID == 0 {
		utils.RespondError(w, http.StatusBadRequest, "vk_group_id is required")
		return
	}

	fileName := r.URL.Query().Get("filename")
	if fileName == "" {
		fileName = "video.mp4"
	}

	group, err := ensureGroup(ctx.GroupID)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	adminToken, err := getActiveVKToken()
	if err != nil || adminToken == "" {
		utils.RespondError(w, http.StatusInternalServerError, "admin token not found")
		return
	}

	vkClient := vk.NewVKClient(adminToken)
	groupIDStr := strconv.Itoa(group.VKGroupID)

	resp, err := vkClient.GetVideoUploadUrl(groupIDStr, fileName)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, fmt.Sprintf("Failed to get video upload url: %v", err))
		return
	}

	attachmentStr := fmt.Sprintf("video%d_%d", resp.OwnerID, resp.VideoID)
	if resp.AccessKey != "" {
		attachmentStr = fmt.Sprintf("video%d_%d_%s", resp.OwnerID, resp.VideoID, resp.AccessKey)
	}

	utils.RespondSuccess(w, map[string]interface{}{
		"upload_url": resp.UploadURL,
		"video_id":   attachmentStr,
	})
}

func listPostsHandler(w http.ResponseWriter, r *http.Request) {
	status := strings.TrimSpace(r.URL.Query().Get("status"))
	if status == "" {
		status = "published"
	}

	posts, err := getPostsByStatus(status, 100, 0)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	response, err := serializePosts(posts)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if status == "pending" {
		response = populateAttachmentURLs(response)
	}

	utils.RespondSuccess(w, response)
}

func createPostHandler(w http.ResponseWriter, r *http.Request) {
	ctx, err := parseLaunchContext(r)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	if ctx.UserID == 0 {
		utils.RespondError(w, http.StatusBadRequest, "vk_user_id is required")
		return
	}
	if ctx.GroupID == 0 {
		utils.RespondError(w, http.StatusBadRequest, "vk_group_id is required")
		return
	}

	if err := r.ParseMultipartForm(50 << 20); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "failed to parse multipart form")
		return
	}

	message := strings.TrimSpace(r.FormValue("message"))
	if len(message) < 10 {
		utils.RespondError(w, http.StatusBadRequest, "message must contain at least 10 characters")
		return
	}

	group, err := ensureGroup(ctx.GroupID)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	user, err := getUserByVKUserID(ctx.UserID)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if user == nil {
		utils.RespondError(w, http.StatusBadRequest, "user not synced")
		return
	}

	var uploadedAttachments []string
	
	if r.MultipartForm != nil {
		if atts, ok := r.MultipartForm.Value["attachments"]; ok {
			for _, att := range atts {
				parts := strings.Split(att, ",")
				for _, part := range parts {
					cleaned := strings.TrimSpace(part)
					if cleaned != "" {
						uploadedAttachments = append(uploadedAttachments, cleaned)
					}
				}
			}
		}
	}

	files := r.MultipartForm.File["media"]

	if len(files) > 0 {
		adminToken, err := getActiveVKToken()
		if err == nil && adminToken != "" {
			vkClient := vk.NewVKClient(adminToken)
			groupIDStr := strconv.Itoa(group.VKGroupID)

			for _, fileHeader := range files {
				file, err := fileHeader.Open()
				if err != nil {
					continue
				}

				// Create temp file
				tmpFile, err := os.CreateTemp("", "upload_*"+filepath.Ext(fileHeader.Filename))
				if err != nil {
					file.Close()
					continue
				}

				io.Copy(tmpFile, file)
				tmpPath := tmpFile.Name()
				tmpFile.Close()
				file.Close()

				// Detect if image or video
				contentType := fileHeader.Header.Get("Content-Type")
				filenameLower := strings.ToLower(fileHeader.Filename)
				
				// Если фронтенд по ошибке прислал видео в поле media
				if strings.HasPrefix(contentType, "video/") || 
				   strings.HasSuffix(filenameLower, ".mp4") || 
				   strings.HasSuffix(filenameLower, ".mov") || 
				   strings.HasSuffix(filenameLower, ".qt") {
					os.Remove(tmpPath)
					continue
				}

				// Грузим только фото для старых клиентов
				att, attURL, err := vkClient.UploadPhotoToWall(tmpPath, groupIDStr)
				if err == nil {
					if attURL != "" {
						uploadedAttachments = append(uploadedAttachments, att+"|"+attURL)
					} else {
						uploadedAttachments = append(uploadedAttachments, att)
					}
				} else {
					log.Printf("Legacy upload failed: %v", err)
				}
				os.Remove(tmpPath)
			}
		}
	}

	// Считываем ключи медиа, загруженных в S3 (фото и видео)
	s3KeysStr := r.FormValue("s3_media_keys")
	if s3KeysStr == "" {
		s3KeysStr = r.FormValue("s3_video_key") // Поддержка старых клиентов
	}

	attachmentsBytes, _ := json.Marshal(uploadedAttachments)
	post := &models.Post{
		UserID:      user.ID,
		GroupID:     group.ID,
		Message:     message,
		Status:      "pending",
		Attachments: string(attachmentsBytes),
		S3VideoKey:  s3KeysStr,
	}
	if err := createPost(post); err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	appURL := fmt.Sprintf("https://vk.com/app%s_-%d#/post_detail/%d", config.Load().VKMiniAppID, group.VKGroupID, post.ID)

	sendNotificationToUser(ctx.UserID, fmt.Sprintf("Ваш пост отправлен на модерацию. Мы сообщим, когда он будет опубликован.\n\n[%s|Проверить статус]", appURL))
	sendNotificationToAdmins(group.ID, fmt.Sprintf("Пользователь предложил новый пост в группу \"%s\". Проверьте панель модерации!\n\n[%s|Перейти к модерации поста]", group.Name, appURL))

	response, err := serializePost(post)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(w, response)
}

func myPostsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.RespondError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	ctx, err := parseLaunchContext(r)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	if ctx.UserID == 0 {
		utils.RespondError(w, http.StatusBadRequest, "vk_user_id is required")
		return
	}

	user, err := getUserByVKUserID(ctx.UserID)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if user == nil {
		utils.RespondSuccess(w, []postResponse{})
		return
	}

	posts, err := getPostsByUserID(user.ID, 100, 0)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	response, err := serializePosts(posts)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	response = populateAttachmentURLs(response)
	utils.RespondSuccess(w, response)
}

func postByIDHandler(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/app/posts/")
	path = strings.Trim(path, "/")
	if path == "" {
		utils.RespondError(w, http.StatusNotFound, "post not found")
		return
	}

	parts := strings.Split(path, "/")
	postID, err := strconv.Atoi(parts[0])
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid post id")
		return
	}

	if len(parts) == 1 {
		if r.Method == http.MethodGet {
			getPostByIDHandler(w, postID)
			return
		}
		if r.Method == http.MethodPut || r.Method == http.MethodPost {
			updatePostContentHandler(w, r, postID)
			return
		}
		if r.Method == http.MethodDelete {
			deletePostHandler(w, r, postID)
			return
		}
		utils.RespondError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	if len(parts) == 2 && parts[1] == "moderate" {
		if r.Method != http.MethodPatch {
			utils.RespondError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		moderatePostHandler(w, r, postID)
		return
	}

	utils.RespondError(w, http.StatusNotFound, "route not found")
}

func getPostByIDHandler(w http.ResponseWriter, postID int) {
	post, err := getPostByID(postID)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if post == nil {
		utils.RespondError(w, http.StatusNotFound, "post not found")
		return
	}

	response, err := serializePost(post)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	responses := populateAttachmentURLs([]postResponse{response})
	utils.RespondSuccess(w, responses[0])
}

func updatePostContentHandler(w http.ResponseWriter, r *http.Request, postID int) {
	ctx, err := parseLaunchContext(r)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	post, err := getPostByID(postID)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if post == nil {
		utils.RespondError(w, http.StatusNotFound, "post not found")
		return
	}

	// Разрешаем редактировать pending, draft и rejected
	if post.Status != "pending" && post.Status != "draft" && post.Status != "rejected" {
		utils.RespondError(w, http.StatusForbidden, "can only edit pending, draft or rejected posts")
		return
	}

	// Проверяем права: автор или модератор
	isAuthor := (post.UserID == ctx.UserID)
	if !isAuthor && !isModerator(ctx.GroupRole) {
		utils.RespondError(w, http.StatusForbidden, "only author or moderator can edit the post")
		return
	}

	var req struct {
		Message     string   `json:"message"`
		S3VideoKeys []string `json:"s3_video_keys"`
		Attachments string   `json:"attachments"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	post.Message = req.Message
	if req.S3VideoKeys != nil {
		post.S3VideoKey = strings.Join(req.S3VideoKeys, ",")
	}
	// We might also update attachments if provided, but let's just check if it's explicitly sent
	// To be safe, if the frontend sends it, we update it.
	// Since we set default `attachments: ''` in frontend if it's empty, we should be careful not to wipe out existing attachments if they aren't sent.
	// Actually, the frontend will send the complete new state of attachments. So we can just overwrite.
	post.Attachments = req.Attachments
	
	// Если пост был отклонен, то после редактирования возвращаем его на модерацию
	wasRejected := post.Status == "rejected"
	if wasRejected {
		post.Status = "pending"
		post.RejectReason = ""
	}

	if err := updatePost(post); err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if wasRejected {
		group, err := getGroupByID(post.GroupID)
		if err == nil && group != nil {
			appURL := fmt.Sprintf("https://vk.com/app%s_-%d#/post_detail/%d", config.Load().VKMiniAppID, group.VKGroupID, post.ID)
			sendNotificationToAdmins(group.ID, fmt.Sprintf("Пользователь обновил отклоненный пост в группе \"%s\". Он снова отправлен на модерацию.\n\n[%s|Перейти к модерации поста]", group.Name, appURL))
		}
	}

	response, err := serializePost(post)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	responses := populateAttachmentURLs([]postResponse{response})
	utils.RespondSuccess(w, responses[0])
}

func moderatePostHandler(w http.ResponseWriter, r *http.Request, postID int) {
	ctx, err := parseLaunchContext(r)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	if !isModerator(ctx.GroupRole) {
		utils.RespondError(w, http.StatusForbidden, "moderation is allowed only for community admins")
		return
	}

	var req struct {
		Status       string `json:"status"`
		PublishDate  string `json:"publish_date"`
		RejectReason string `json:"reject_reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	post, err := getPostByID(postID)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if post == nil {
		utils.RespondError(w, http.StatusNotFound, "post not found")
		return
	}

	if post.Status != "pending" {
		utils.RespondError(w, http.StatusBadRequest, "post is already moderated")
		return
	}

	group, err := getGroupByID(post.GroupID)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if group == nil {
		utils.RespondError(w, http.StatusBadRequest, "group not found")
		return
	}

	appURL := fmt.Sprintf("https://vk.com/app%s_-%d#/post_detail/%d", config.Load().VKMiniAppID, group.VKGroupID, post.ID)

	switch req.Status {
	case "published", "scheduled":
		var publishUnix int64
		if req.Status == "scheduled" {
			if strings.TrimSpace(req.PublishDate) == "" {
				utils.RespondError(w, http.StatusBadRequest, "publish_date is required for scheduled status")
				return
			}
			publishDate, err := time.Parse(time.RFC3339, req.PublishDate)
			if err != nil {
				utils.RespondError(w, http.StatusBadRequest, "publish_date must be RFC3339")
				return
			}
			post.PublishDate = publishDate
			publishUnix = publishDate.Unix()
		} else {
			post.PublishDate = time.Time{}
		}

		// Берём активный токен админа
		adminToken, err := getActiveVKToken()
		if err != nil {
			utils.RespondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if adminToken == "" {
			utils.RespondError(w, http.StatusBadRequest, "VK account is not connected — please login at /vk-connect in the admin panel")
			return
		}
		token := adminToken

		var attachments []string
		if post.Attachments != "" {
			var parts []string
			if strings.HasPrefix(post.Attachments, "[") {
				json.Unmarshal([]byte(post.Attachments), &parts)
			} else {
				parts = strings.Split(post.Attachments, ",")
			}
			for _, p := range parts {
				idAndUrl := strings.SplitN(p, "|", 2)
				attachments = append(attachments, idAndUrl[0])
			}
		}

		client := vk.NewVKClient(token)

		// Если есть медиа в S3 - скачиваем и загружаем в VK
		if post.S3VideoKey != "" {
			s3, err := s3client.New()
			if err == nil {
				s3Keys := strings.Split(post.S3VideoKey, ",")
				
				for _, key := range s3Keys {
					key = strings.TrimSpace(key)
					if key == "" {
						continue
					}
					log.Printf("[Moderate] Downloading S3 media: %s", key)
					rc, _, err := s3.GetObject(context.Background(), key)
					if err == nil {
							var att, attURL string
							var uploadErr error
							ext := strings.ToLower(filepath.Ext(key))

							tmpFile, err := os.CreateTemp("", "moderation_media_*"+ext)
							if err == nil {
								io.Copy(tmpFile, rc)
								tmpPath := tmpFile.Name()
								tmpFile.Close()
								rc.Close()

								if ext == ".mp4" || ext == ".mov" || ext == ".qt" {
									// Загружаем как видео
									att, attURL, uploadErr = client.UploadVideo(tmpPath, strconv.Itoa(group.VKGroupID), filepath.Base(key))
								} else {
									// Загружаем как фото
									att, attURL, uploadErr = client.UploadPhotoToWall(tmpPath, strconv.Itoa(group.VKGroupID))
								}

							if uploadErr == nil {
								attachments = append(attachments, att)
								// Обновляем attachments в самом посте (чтобы сохранить URL если надо)
								var oldParts []string
								if post.Attachments != "" {
									if strings.HasPrefix(post.Attachments, "[") {
										json.Unmarshal([]byte(post.Attachments), &oldParts)
									} else {
										oldParts = strings.Split(post.Attachments, ",")
									}
								}
								if attURL != "" {
									oldParts = append(oldParts, att+"|"+attURL)
								} else {
									oldParts = append(oldParts, att)
								}
								newAtts, _ := json.Marshal(oldParts)
								post.Attachments = string(newAtts)
								
								// Удаляем из S3 после успешной загрузки
								go s3DeleteVideoKey(key)
							} else {
								log.Printf("[Moderate] VK Upload error for %s: %v", key, uploadErr)
							}
							os.Remove(tmpPath)
						} else {
							rc.Close()
						}
					}
				}
				post.S3VideoKey = "" // Очищаем ключи, они больше не нужны
			}
		}

		// from_group=true: постим от имени группы (требует токена сообщества или токена админа с правами)
		vkPostID, err := client.WallPost("-"+strconv.Itoa(group.VKGroupID), post.Message, attachments, true, publishUnix)
		if err != nil {
			log.Printf("[Moderate] VK wall.post error for group %d: %v", group.VKGroupID, err)
			utils.RespondError(w, http.StatusBadRequest, err.Error())
			return
		}
		post.VKPostID = vkPostID
		post.Status = req.Status

	case "rejected":
		post.Status = "rejected"
		post.RejectReason = req.RejectReason
		post.PublishDate = time.Time{}
		// Видео не удаляем из S3 сразу, чтобы автор мог его посмотреть.
	default:
		utils.RespondError(w, http.StatusBadRequest, "unsupported status")
		return
	}

	if err := updatePost(post); err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if author, err := getUserByID(post.UserID); err == nil && author != nil {
		switch req.Status {
		case "published":
			sendNotificationToUser(author.VKUserID, fmt.Sprintf("Ваш предложенный пост был успешно опубликован!\n\n[%s|Открыть пост]", appURL))
		case "scheduled":
			sendNotificationToUser(author.VKUserID, fmt.Sprintf("Ваш предложенный пост поставлен в очередь на публикацию: %s\n\n[%s|Открыть пост]", post.PublishDate.Format("02.01.2006 15:04"), appURL))
		case "rejected":
			rejectMsg := "К сожалению, ваш предложенный пост был отклонен модератором."
			if post.RejectReason != "" {
				rejectMsg += fmt.Sprintf("\nПричина: %s", post.RejectReason)
			}
			rejectMsg += fmt.Sprintf("\n\n[%s|Посмотреть детали]", appURL)
			sendNotificationToUser(author.VKUserID, rejectMsg)
		}
	}

	response, err := serializePost(post)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(w, response)
}

func groupSettingsHandler(w http.ResponseWriter, r *http.Request) {
	ctx, err := parseLaunchContext(r)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	if ctx.GroupID == 0 {
		utils.RespondError(w, http.StatusBadRequest, "vk_group_id is required")
		return
	}

	group, err := ensureGroup(ctx.GroupID)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	switch r.Method {
	case http.MethodGet:
		utils.RespondSuccess(w, groupToSettings(group))
	case http.MethodPatch:
		if !isModerator(ctx.GroupRole) {
			utils.RespondError(w, http.StatusForbidden, "settings update is allowed only for community admins")
			return
		}

		var req struct {
			Name       *string `json:"name"`
			ScreenName *string `json:"screen_name"`
			Photo200   *string `json:"photo_200"`
			CityID     *int    `json:"city_id"`
			CityTitle  *string `json:"city_title"`
			IsActive   *bool   `json:"is_active"`
			NotifyUserIDs []int `json:"notify_user_ids"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			utils.RespondError(w, http.StatusBadRequest, "invalid JSON")
			return
		}

		if req.Name != nil {
			group.Name = strings.TrimSpace(*req.Name)
		}
		if req.ScreenName != nil {
			group.ScreenName = strings.TrimSpace(*req.ScreenName)
		}
		if req.Photo200 != nil {
			group.Photo200 = strings.TrimSpace(*req.Photo200)
		}
		if req.CityID != nil {
			group.CityID = req.CityID
		}
		if req.CityTitle != nil {
			title := strings.TrimSpace(*req.CityTitle)
			group.CityTitle = &title
		}
		if req.IsActive != nil {
			group.IsActive = *req.IsActive
		}
		if req.NotifyUserIDs != nil {
			b, _ := json.Marshal(req.NotifyUserIDs)
			group.NotifyUserIDs = string(b)
		}

		if group.Name == "" {
			group.Name = "VK Community #" + strconv.Itoa(group.VKGroupID)
		}
		if group.ScreenName == "" {
			group.ScreenName = "club" + strconv.Itoa(group.VKGroupID)
		}

		if err := updateGroup(group); err != nil {
			utils.RespondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		utils.RespondSuccess(w, groupToSettings(group))
	default:
		utils.RespondError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func ensureGroup(vkGroupID int) (*models.Group, error) {
	group, err := getGroupByVKGroupID(vkGroupID)
	if err != nil {
		return nil, err
	}
	if group != nil {
		// Если группа была отключена, включаем её обратно
		if !group.IsActive {
			group.IsActive = true
			_ = updateGroup(group)
		}
		// Если запись была создана с дефолтными данными, пробуем обогатить ее из VK.
		if groupNeedsVKSync(group) {
			if vkData, err := fetchVKGroupData(vkGroupID); err == nil && vkData != nil {
				group.Name = vkData.Name
				group.ScreenName = vkData.ScreenName
				group.Photo200 = vkData.Photo200
				_ = updateGroup(group)
			}
		}
		return group, nil
	}
	group = &models.Group{
		VKGroupID:  vkGroupID,
		Name:       "VK Community #" + strconv.Itoa(vkGroupID),
		ScreenName: "club" + strconv.Itoa(vkGroupID),
		IsActive:   true,
	}
	if vkData, err := fetchVKGroupData(vkGroupID); err == nil && vkData != nil {
		group.Name = vkData.Name
		group.ScreenName = vkData.ScreenName
		group.Photo200 = vkData.Photo200
	}
	if err := createGroup(group); err != nil {
		return nil, err
	}
	return group, nil
}

func groupNeedsVKSync(group *models.Group) bool {
	if group == nil {
		return false
	}

	defaultName := "VK Community #" + strconv.Itoa(group.VKGroupID)
	defaultScreenName := "club" + strconv.Itoa(group.VKGroupID)

	return strings.TrimSpace(group.Name) == "" ||
		strings.TrimSpace(group.ScreenName) == "" ||
		strings.TrimSpace(group.Photo200) == "" ||
		group.Name == defaultName ||
		group.ScreenName == defaultScreenName
}

func fetchVKGroupData(vkGroupID int) (*models.Group, error) {
	cfg := config.Load()
	token := strings.TrimSpace(cfg.VKMiniAppServiceKey)
	if token == "" {
		token = strings.TrimSpace(cfg.VKServiceKey)
	}
	if token == "" {
		return nil, nil
	}

	client := vk.NewVKClient(token)
	groupInfo, err := client.GroupsGetByID(vkGroupID)
	if err != nil {
		return nil, err
	}

	name := strings.TrimSpace(groupInfo.Name)
	if name == "" {
		name = "VK Community #" + strconv.Itoa(vkGroupID)
	}
	screenName := strings.TrimSpace(groupInfo.ScreenName)
	if screenName == "" {
		screenName = "club" + strconv.Itoa(vkGroupID)
	}

	return &models.Group{
		VKGroupID:  vkGroupID,
		Name:       name,
		ScreenName: screenName,
		Photo200:   strings.TrimSpace(groupInfo.Photo200),
		IsActive:   true,
	}, nil
}

func serializePosts(posts []*models.Post) ([]postResponse, error) {
	result := make([]postResponse, 0, len(posts))
	for _, post := range posts {
		item, err := serializePost(post)
		if err != nil {
			return nil, err
		}
		result = append(result, item)
	}
	return result, nil
}

func serializePost(post *models.Post) (postResponse, error) {
	var (
		group *models.Group
		user  *models.User
		err   error
	)

	if post.GroupID != 0 {
		group, err = getGroupByID(post.GroupID)
		if err != nil {
			return postResponse{}, err
		}
	}
	if post.UserID != 0 {
		user, err = getUserByID(post.UserID)
		if err != nil {
			return postResponse{}, err
		}
	}

	response := postResponse{
		ID:        post.ID,
		Title:     makePostTitle(post.Message),
		Message:     post.Message,
		Status:      post.Status,
		VKPostID:    post.VKPostID,
		Attachments: post.Attachments,
		S3VideoKey:  post.S3VideoKey,
		RejectReason: post.RejectReason,
		CreatedAt:   post.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   post.UpdatedAt.Format(time.RFC3339),
	}
	if group != nil {
		response.Group = userFacingGroup(group)
	}
	if user != nil {
		response.Author = userToSummary(user)
	}
	if !post.PublishDate.IsZero() {
		pd := post.PublishDate.Format(time.RFC3339)
		response.PublishDate = &pd
	}

	return response, nil
}

func userFacingGroup(group *models.Group) *groupSummary {
	if group == nil {
		return nil
	}
	return &groupSummary{
		ID:         group.ID,
		VKGroupID:  group.VKGroupID,
		Name:       group.Name,
		ScreenName: group.ScreenName,
		Photo200:   group.Photo200,
	}
}

func populateAttachmentURLs(posts []postResponse) []postResponse {
	// Получаем токен один раз для всех видео-запросов
	adminToken, tokenErr := getActiveVKToken()

	for i, p := range posts {
		var urls []AttachmentURL

		if p.Attachments != "" {
			var parts []string
			if strings.HasPrefix(p.Attachments, "[") {
				json.Unmarshal([]byte(p.Attachments), &parts)
			} else {
				parts = strings.Split(p.Attachments, ",")
			}

			for _, part := range parts {
				idAndUrl := strings.SplitN(part, "|", 2)
				id := strings.TrimSpace(idAndUrl[0])
				if id == "" {
					continue
				}
				var mediaURL string
				if len(idAndUrl) > 1 {
					mediaURL = idAndUrl[1]
				}

				if strings.HasPrefix(id, "photo") {
					urls = append(urls, AttachmentURL{ID: id, Type: "photo", URL: mediaURL})
				} else if strings.HasPrefix(id, "video") {
					// Если URL превью ещё не сохранён — запрашиваем из VK
					if mediaURL == "" && tokenErr == nil && adminToken != "" {
						vkClient := vk.NewVKClient(adminToken)
						thumb, err := vkClient.GetVideoThumbnail(id)
						if err != nil {
							log.Printf("[populateAttachmentURLs] video.get failed for %s: %v", id, err)
						} else {
							mediaURL = thumb
						}
					}
					urls = append(urls, AttachmentURL{ID: id, Type: "vk_video", URL: mediaURL})
				}
			}
		}

		if p.S3VideoKey != "" {
			s3, err := s3client.New()
			if err == nil {
				keys := strings.Split(p.S3VideoKey, ",")
				for _, key := range keys {
					key = strings.TrimSpace(key)
					if key == "" {
						continue
					}
					presignedURL, err := s3.PresignGetURL(context.Background(), key, time.Hour*24)
					if err != nil {
						log.Printf("[populateAttachmentURLs] failed to presign S3 URL for %s: %v", key, err)
					} else {
						ext := strings.ToLower(filepath.Ext(key))
						attType := "s3_image"
						if ext == ".mp4" || ext == ".mov" || ext == ".qt" {
							attType = "s3_video"
						}
						urls = append(urls, AttachmentURL{ID: "s3:" + key, Type: attType, URL: presignedURL})
					}
				}
			} else {
				log.Printf("[populateAttachmentURLs] S3 not configured: %v", err)
			}
		}

		posts[i].AttachmentURLs = urls
		log.Printf("[populateAttachmentURLs] Post ID %d attachments: %+v", p.ID, urls)
	}
	return posts
}


func groupToSettings(group *models.Group) *groupSettingsResponse {
	if group == nil {
		return nil
	}

	resp := &groupSettingsResponse{
		ID:         group.ID,
		VKGroupID:  group.VKGroupID,
		Name:       group.Name,
		ScreenName: group.ScreenName,
		Photo200:   group.Photo200,
		CityID:     group.CityID,
		CityTitle:  group.CityTitle,
		IsActive:   group.IsActive,
		HasToken:   group.AccessToken != "",
	}
	
	if group.NotifyUserIDs != "" {
		json.Unmarshal([]byte(group.NotifyUserIDs), &resp.NotifyUserIDs)
	}
	if resp.NotifyUserIDs == nil {
		resp.NotifyUserIDs = []int{}
	}

	return resp
}

func userToSummary(user *models.User) *userSummary {
	if user == nil {
		return nil
	}
	return &userSummary{
		ID:        user.ID,
		VKUserID:  user.VKUserID,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Photo200:  user.Photo200,
		Role:      user.Role,
	}
}

func makePostTitle(message string) string {
	message = strings.TrimSpace(message)
	if len(message) <= 60 {
		return message
	}
	return strings.TrimSpace(message[:57]) + "..."
}

func parseLaunchContext(r *http.Request) (*vkLaunchContext, error) {
	signature := r.Header.Get("x-vk-sign")
	if signature == "" {
		// Fallback to Authorization header if x-vk-sign is stripped by API Gateway
		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			signature = strings.TrimPrefix(authHeader, "Bearer ")
		}
	}
	if signature == "" {
		// Fallback to URL Query parameter
		signature = r.URL.Query().Get("x-vk-sign")
	}
	if signature == "" {
		return &vkLaunchContext{}, nil
	}
	values, err := url.ParseQuery(signature)
	if err != nil {
		return nil, err
	}

	ctx := &vkLaunchContext{
		GroupRole: values.Get("vk_viewer_group_role"),
	}
	if v := values.Get("vk_user_id"); v != "" {
		if userID, err := strconv.Atoi(v); err == nil {
			ctx.UserID = userID
		}
	}
	if v := values.Get("vk_group_id"); v != "" {
		if groupID, err := strconv.Atoi(v); err == nil {
			ctx.GroupID = groupID
		}
	}
	return ctx, nil
}

func isModerator(role string) bool {
	switch role {
	case "admin", "editor", "moder":
		return true
	default:
		return false
	}
}

func upsertUser(vkUserID int, firstName, lastName, photo200 string) (*models.User, error) {
	user, err := getUserByVKUserID(vkUserID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		user = &models.User{
			VKUserID:  vkUserID,
			FirstName: firstName,
			LastName:  lastName,
			Photo200:  photo200,
			Role:      "user",
		}
		if err := createUser(user); err != nil {
			return nil, err
		}
		return user, nil
	}

	needsUpdate := user.FirstName != firstName || user.LastName != lastName || user.Photo200 != photo200
	if needsUpdate {
		user.FirstName = firstName
		user.LastName = lastName
		user.Photo200 = photo200
		if err := updateUser(user); err != nil {
			return nil, err
		}
	}
	return user, nil
}

func createUser(user *models.User) error {
	if err := database.QueryRow(`
		INSERT INTO users (vk_user_id, first_name, last_name, photo_200, role)
		VALUES (?, ?, ?, ?, ?)
		RETURNING id
	`, user.VKUserID, user.FirstName, user.LastName, user.Photo200, user.Role).Scan(&user.ID); err != nil {
		return err
	}
	now := time.Now()
	user.CreatedAt = now
	user.UpdatedAt = now
	return nil
}

func updateUser(user *models.User) error {
	_, err := database.Exec(`
		UPDATE users
		SET first_name = ?, last_name = ?, photo_200 = ?, role = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, user.FirstName, user.LastName, user.Photo200, user.Role, user.ID)
	if err != nil {
		return err
	}
	user.UpdatedAt = time.Now()
	return nil
}

func getUserByID(id int) (*models.User, error) {
	row := database.QueryRow(`
		SELECT id, vk_user_id, first_name, last_name, photo_200, role, created_at, updated_at
		FROM users WHERE id = ?
	`, id)
	return scanUser(row)
}

func getUserByVKUserID(vkUserID int) (*models.User, error) {
	row := database.QueryRow(`
		SELECT id, vk_user_id, first_name, last_name, photo_200, role, created_at, updated_at
		FROM users WHERE vk_user_id = ?
	`, vkUserID)
	return scanUser(row)
}

func scanUser(row *sql.Row) (*models.User, error) {
	user := &models.User{}
	err := row.Scan(
		&user.ID,
		&user.VKUserID,
		&user.FirstName,
		&user.LastName,
		&user.Photo200,
		&user.Role,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return user, nil
}

func createGroup(group *models.Group) error {
	if err := database.QueryRow(`
		INSERT INTO groups (vk_group_id, name, screen_name, photo_200, city_id, city_title, access_token, is_active, notify_user_ids)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		RETURNING id
	`, group.VKGroupID, group.Name, group.ScreenName, group.Photo200, group.CityID, group.CityTitle, group.AccessToken, group.IsActive, group.NotifyUserIDs).Scan(&group.ID); err != nil {
		return err
	}
	now := time.Now()
	group.CreatedAt = now
	group.UpdatedAt = now
	return nil
}

func updateGroup(group *models.Group) error {
	_, err := database.Exec(`
		UPDATE groups
		SET name = ?, screen_name = ?, photo_200 = ?, city_id = ?, city_title = ?, access_token = ?, is_active = ?, notify_user_ids = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, group.Name, group.ScreenName, group.Photo200, group.CityID, group.CityTitle, group.AccessToken, group.IsActive, group.NotifyUserIDs, group.ID)
	if err != nil {
		return err
	}
	group.UpdatedAt = time.Now()

	go vk.EnsureCallbackServer(group)

	return nil
}

func getGroupByID(id int) (*models.Group, error) {
	row := database.QueryRow(`
		SELECT id, vk_group_id, name, screen_name, photo_200, city_id, city_title, access_token, is_active, notify_user_ids, created_at, updated_at
		FROM groups WHERE id = ?
	`, id)
	return scanGroup(row)
}

func getGroupByVKGroupID(vkGroupID int) (*models.Group, error) {
	row := database.QueryRow(`
		SELECT id, vk_group_id, name, screen_name, photo_200, city_id, city_title, access_token, is_active, notify_user_ids, created_at, updated_at
		FROM groups WHERE vk_group_id = ?
	`, vkGroupID)
	return scanGroup(row)
}

func scanGroup(row *sql.Row) (*models.Group, error) {
	group := &models.Group{}
	err := row.Scan(
		&group.ID,
		&group.VKGroupID,
		&group.Name,
		&group.ScreenName,
		&group.Photo200,
		&group.CityID,
		&group.CityTitle,
		&group.AccessToken,
		&group.IsActive,
		&group.NotifyUserIDs,
		&group.CreatedAt,
		&group.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return group, nil
}

func createPost(post *models.Post) error {
	if err := database.QueryRow(`
		INSERT INTO posts (vk_post_id, user_id, group_id, message, attachments, s3_video_key, status, publish_date)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		RETURNING id
	`, post.VKPostID, post.UserID, post.GroupID, post.Message, post.Attachments, post.S3VideoKey, post.Status, nullableTime(post.PublishDate)).Scan(&post.ID); err != nil {
		return err
	}
	now := time.Now()
	post.CreatedAt = now
	post.UpdatedAt = now
	return nil
}

func updatePost(post *models.Post) error {
	_, err := database.Exec(`
		UPDATE posts
		SET vk_post_id = ?, user_id = ?, group_id = ?, message = ?, attachments = ?, s3_video_key = ?, status = ?, reject_reason = ?, publish_date = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, post.VKPostID, post.UserID, post.GroupID, post.Message, post.Attachments, post.S3VideoKey, post.Status, post.RejectReason, nullableTime(post.PublishDate), post.ID)
	if err != nil {
		return err
	}
	post.UpdatedAt = time.Now()
	return nil
}

func getPostByID(id int) (*models.Post, error) {
	row := database.QueryRow(`
		SELECT id, vk_post_id, user_id, group_id, message, attachments, s3_video_key, status, reject_reason, publish_date, created_at, updated_at
		FROM posts WHERE id = ?
	`, id)
	return scanPost(row)
}

func getPostsByStatus(status string, limit, offset int) ([]*models.Post, error) {
	rows, err := database.Query(`
		SELECT id, vk_post_id, user_id, group_id, message, attachments, s3_video_key, status, reject_reason, publish_date, created_at, updated_at
		FROM posts
		WHERE status = ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`, status, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanPostRows(rows)
}

func getPostsByUserID(userID int, limit, offset int) ([]*models.Post, error) {
	rows, err := database.Query(`
		SELECT id, vk_post_id, user_id, group_id, message, attachments, s3_video_key, status, reject_reason, publish_date, created_at, updated_at
		FROM posts
		WHERE user_id = ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanPostRows(rows)
}

func scanPostRows(rows *sql.Rows) ([]*models.Post, error) {
	var result []*models.Post
	for rows.Next() {
		post, err := scanPostFromRows(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, post)
	}
	return result, nil
}

func scanPost(row *sql.Row) (*models.Post, error) {
	var (
		post        models.Post
		dbUserID    sql.NullInt64
		dbVKPostID  sql.NullInt64
		publishDate sql.NullTime
	)

	var s3VideoKey sql.NullString
	var rejectReason sql.NullString
	err := row.Scan(
		&post.ID,
		&dbVKPostID,
		&dbUserID,
		&post.GroupID,
		&post.Message,
		&post.Attachments,
		&s3VideoKey,
		&post.Status,
		&rejectReason,
		&publishDate,
		&post.CreatedAt,
		&post.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if s3VideoKey.Valid {
		post.S3VideoKey = s3VideoKey.String
	}
	if rejectReason.Valid {
		post.RejectReason = rejectReason.String
	}
	if dbUserID.Valid {
		post.UserID = int(dbUserID.Int64)
	}
	if dbVKPostID.Valid {
		post.VKPostID = int(dbVKPostID.Int64)
	}
	if publishDate.Valid {
		post.PublishDate = publishDate.Time
	}
	return &post, nil
}

func scanPostFromRows(rows *sql.Rows) (*models.Post, error) {
	var (
		post        models.Post
		dbUserID    sql.NullInt64
		dbVKPostID  sql.NullInt64
		publishDate sql.NullTime
	)

	var s3VideoKey sql.NullString
	var rejectReason sql.NullString
	if err := rows.Scan(
		&post.ID,
		&dbVKPostID,
		&dbUserID,
		&post.GroupID,
		&post.Message,
		&post.Attachments,
		&s3VideoKey,
		&post.Status,
		&rejectReason,
		&publishDate,
		&post.CreatedAt,
		&post.UpdatedAt,
	); err != nil {
		return nil, err
	}

	if dbUserID.Valid {
		post.UserID = int(dbUserID.Int64)
	}
	if dbVKPostID.Valid {
		post.VKPostID = int(dbVKPostID.Int64)
	}
	if s3VideoKey.Valid {
		post.S3VideoKey = s3VideoKey.String
	}
	if rejectReason.Valid {
		post.RejectReason = rejectReason.String
	}
	if publishDate.Valid {
		post.PublishDate = publishDate.Time
	}
	return &post, nil
}

func nullableTime(t time.Time) interface{} {
	if t.IsZero() {
		return nil
	}
	return t
}

// getActiveVKToken возвращает активный access_token из vk_accounts
// (тот, что подключён через страницу /vk-connect)
func getActiveVKToken() (string, error) {
	var token string
	err := database.QueryRow(`
		SELECT access_token
		FROM vk_accounts
		WHERE is_active = ?
		ORDER BY updated_at DESC
		LIMIT 1
	`, true).Scan(&token)
	if err == sql.ErrNoRows {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(token), nil
}

func sendNotificationToAdmins(groupID int, message string) {
	go func() {
		cfg := config.Load()
		if cfg.VKOfficialGroupToken == "" {
			return
		}
		client := vk.NewVKClient(cfg.VKOfficialGroupToken)

		var notifyUserIDsStr string
		err := database.QueryRow("SELECT notify_user_ids FROM groups WHERE id = ?", groupID).Scan(&notifyUserIDsStr)
		if err != nil || notifyUserIDsStr == "" || notifyUserIDsStr == "[]" {
			return
		}

		var notifyUserIDs []int
		if err := json.Unmarshal([]byte(notifyUserIDsStr), &notifyUserIDs); err != nil {
			return
		}

		for _, vkUserID := range notifyUserIDs {
			_ = client.SendDirectMessage(vkUserID, message)
		}
	}()
}

func sendNotificationToUser(vkUserID int, message string) {
	go func() {
		cfg := config.Load()
		if cfg.VKOfficialGroupToken == "" {
			return
		}
		client := vk.NewVKClient(cfg.VKOfficialGroupToken)
		_ = client.SendDirectMessage(vkUserID, message)
	}()
}

type managerResponse struct {
	ID        int    `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Role      string `json:"role"`
}

func groupManagersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.RespondError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	ctx, err := parseLaunchContext(r)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	if ctx.GroupID == 0 {
		utils.RespondError(w, http.StatusBadRequest, "vk_group_id is required")
		return
	}

	if !isModerator(ctx.GroupRole) {
		utils.RespondError(w, http.StatusForbidden, "allowed only for community admins")
		return
	}

	token, err := getActiveVKToken()
	if err != nil || token == "" {
		utils.RespondError(w, http.StatusBadRequest, "no active VK admin token")
		return
	}

	client := vk.NewVKClient(token)
	resp, err := client.CallMethod("groups.getMembers", map[string]string{
		"group_id": strconv.Itoa(ctx.GroupID),
		"filter":   "managers",
		"fields":   "first_name,last_name",
	})
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var vkResp struct {
		Items []struct {
			ID        int    `json:"id"`
			FirstName string `json:"first_name"`
			LastName  string `json:"last_name"`
			Role      string `json:"role"`
		} `json:"items"`
	}

	if err := json.Unmarshal(resp, &vkResp); err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	managers := []managerResponse{}
	for _, item := range vkResp.Items {
		managers = append(managers, managerResponse{
			ID:        item.ID,
			FirstName: item.FirstName,
			LastName:  item.LastName,
			Role:      item.Role,
		})
	}

	utils.RespondSuccess(w, managers)
}

func citiesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.RespondError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	q := r.URL.Query().Get("q")
	if q == "" {
		utils.RespondSuccess(w, []interface{}{})
		return
	}

	client := vk.NewVKClient(os.Getenv("VK_SERVICE_KEY"))
	params := map[string]string{
		"country_id": "1", // Russia
		"q":          q,
		"need_all":   "1",
		"count":      "20",
	}

	resp, err := client.CallMethod("database.getCities", params)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "Failed to get cities: "+err.Error())
		return
	}

	var vkResp struct {
		Response struct {
			Count int `json:"count"`
			Items []struct {
				ID     int    `json:"id"`
				Title  string `json:"title"`
				Region string `json:"region,omitempty"`
			} `json:"items"`
		} `json:"response"`
	}

	if err := json.Unmarshal(resp, &vkResp); err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if vkResp.Response.Items == nil {
		vkResp.Response.Items = make([]struct {
			ID     int    `json:"id"`
			Title  string `json:"title"`
			Region string `json:"region,omitempty"`
		}, 0)
	}

	utils.RespondSuccess(w, vkResp.Response.Items)
}

func saveGroupTokenHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.RespondError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	ctx, err := parseLaunchContext(r)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	if !isModerator(ctx.GroupRole) {
		utils.RespondError(w, http.StatusForbidden, "only community admins can set token")
		return
	}

	var req struct {
		VKGroupID   int    `json:"vk_group_id"`
		AccessToken string `json:"access_token"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid json")
		return
	}

	if req.VKGroupID == 0 || req.AccessToken == "" {
		utils.RespondError(w, http.StatusBadRequest, "vk_group_id and access_token required")
		return
	}

	if req.VKGroupID != ctx.GroupID {
		utils.RespondError(w, http.StatusForbidden, "can only update current group")
		return
	}

	group, err := ensureGroup(ctx.GroupID)
	if err != nil || group == nil {
		utils.RespondError(w, http.StatusNotFound, "group not found")
		return
	}

	group.AccessToken = req.AccessToken
	if err := updateGroup(group); err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "failed to save token")
		return
	}

	go vk.EnsureCallbackServer(group)

	utils.RespondSuccess(w, map[string]interface{}{
		"group": groupToSettings(group),
	})
}


func deletePostHandler(w http.ResponseWriter, r *http.Request, postID int) {
	ctx, err := parseLaunchContext(r)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	if ctx.UserID == 0 {
		utils.RespondError(w, http.StatusBadRequest, "vk_user_id is required")
		return
	}

	user, err := getUserByVKUserID(ctx.UserID)
	if err != nil || user == nil {
		utils.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var reqBody struct {
		Reason  string `json:"reason"`
		Comment string `json:"comment"`
	}
	if err := json.NewDecoder(r.Body).Decode(&reqBody); err != nil && err != io.EOF {
		utils.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Сначала проверим, есть ли пост и принадлежит ли он пользователю
	var s3VideoKey, attachments string
	err = database.DB.QueryRow("SELECT s3_video_key, attachments FROM posts WHERE id = $1 AND user_id = $2", postID, user.ID).Scan(&s3VideoKey, &attachments)
	if err != nil {
		if err == sql.ErrNoRows {
			utils.RespondError(w, http.StatusNotFound, "post not found or you are not the author")
			return
		}
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Удаляем медиа из S3
	if s3VideoKey != "" {
		s3Client, err := s3client.New()
		if err == nil {
			// attachments может содержать список S3 ключей, если мы поддерживаем несколько фото
			s3Keys := strings.Split(s3VideoKey, ",")
			for _, key := range s3Keys {
				if key != "" {
					s3Client.DeleteObject(r.Context(), key)
				}
			}
		}
	}

	// Soft-delete: обновляем статус и очищаем медиа
	res, err := database.DB.Exec(
		"UPDATE posts SET status = 'deleted', delete_reason = $1, delete_comment = $2, s3_video_key = '', attachments = '' WHERE id = $3 AND user_id = $4", 
		reqBody.Reason, reqBody.Comment, postID, user.ID,
	)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	
	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		utils.RespondError(w, http.StatusNotFound, "post not found or you are not the author")
		return
	}

	utils.RespondSuccess(w, map[string]string{"status": "deleted"})
}

// s3PresignHandler генерирует presigned PUT URL для загрузки медиа напрямую в S3.
// GET /api/app/upload/presign?filename=video.mp4&type=video/mp4
func s3PresignHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodGet {
		utils.RespondError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	_, err := parseLaunchContext(r)
	if err != nil {
		utils.RespondError(w, http.StatusUnauthorized, err.Error())
		return
	}

	// Генерируем уникальный ключ для файла
	filename := r.URL.Query().Get("filename")
	contentType := r.URL.Query().Get("type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	
	key := fmt.Sprintf("pending-media/%d_%s", time.Now().UnixNano(), filename)
	if filename == "" {
		key = fmt.Sprintf("pending-media/%d_file", time.Now().UnixNano())
	}

	s3, err := s3client.New()
	if err != nil {
		log.Printf("[s3VideoPresignHandler] S3 not configured: %v", err)
		utils.RespondError(w, http.StatusServiceUnavailable, "S3 storage not configured")
		return
	}

	presignURL, err := s3.PresignPutURL(context.Background(), key, contentType, 15*time.Minute)
	if err != nil {
		log.Printf("[s3VideoPresignHandler] presign error: %v", err)
		utils.RespondError(w, http.StatusInternalServerError, "failed to generate upload URL")
		return
	}

	utils.RespondSuccess(w, map[string]string{
		"upload_url": presignURL,
		"key":        key,
	})
}

// s3DeleteVideoKey удаляет видео из S3 (silent — ошибка не критична)
func s3DeleteVideoKey(key string) {
	if key == "" {
		return
	}
	s3, err := s3client.New()
	if err != nil {
		log.Printf("[s3Delete] S3 not configured: %v", err)
		return
	}
	if err := s3.DeleteObject(context.Background(), key); err != nil {
		log.Printf("[s3Delete] failed to delete %s: %v", key, err)
	} else {
		log.Printf("[s3Delete] deleted %s from S3", key)
	}
}

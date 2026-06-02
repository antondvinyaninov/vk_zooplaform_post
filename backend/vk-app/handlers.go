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

type postPublicationResponse struct {
	ID           int           `json:"id"`
	GroupID      int           `json:"group_id"`
	Group        *groupSummary `json:"group,omitempty"`
	Status       string        `json:"status"`
	VKPostID     int           `json:"vk_post_id,omitempty"`
	RejectReason string        `json:"reject_reason,omitempty"`
	PostTypeID   string        `json:"post_type_id,omitempty"`
	CustomFields string        `json:"custom_fields,omitempty"`
	PublishDate  *string       `json:"publish_date,omitempty"`
	CreatedAt    string        `json:"created_at"`
	UpdatedAt    string        `json:"updated_at"`
}

type postResponse struct {
	ID             int                       `json:"id"`
	Title          string                    `json:"title"`
	Message        string                    `json:"message"`
	Author         *userSummary              `json:"author,omitempty"`
	Attachments    string                    `json:"attachments,omitempty"`
	S3VideoKey     string                    `json:"s3_video_key,omitempty"`
	AttachmentURLs []AttachmentURL           `json:"attachment_urls,omitempty"`
	CreatedAt      string                    `json:"created_at"`
	UpdatedAt      string                    `json:"updated_at"`
	Publications   []postPublicationResponse `json:"publications,omitempty"`

	// Legacy fields for backward compatibility
	Status       string        `json:"status,omitempty"`
	VKPostID     int           `json:"vk_post_id,omitempty"`
	Group        *groupSummary `json:"group,omitempty"`
	PublishDate  *string       `json:"publish_date,omitempty"`
	RejectReason string        `json:"reject_reason,omitempty"`
}

type AttachmentURL struct {
	ID   string `json:"id"`
	Type string `json:"type"`
	URL  string `json:"url"`
}

type mediaUploadFailure struct {
	Key   string
	Stage string
	Err   error
}

type wallAttachmentVerification struct {
	Actual   []string
	Missing  []string
	Err      error
	Attempts int
}

type postMediaStats struct {
	Total   int
	Photos  int
	Videos  int
	Unknown int
}

var mediaVerifyRetryDelays = []time.Duration{
	5 * time.Second,
	15 * time.Second,
	30 * time.Second,
}

func parseMediaKeys(keys string) []string {
	var result []string
	for _, key := range strings.Split(keys, ",") {
		key = strings.TrimSpace(key)
		if key != "" {
			result = append(result, key)
		}
	}
	return result
}

func removeMediaKey(keys []string, keyToRemove string) []string {
	result := make([]string, 0, len(keys))
	for _, key := range keys {
		if key != keyToRemove {
			result = append(result, key)
		}
	}
	return result
}

func formatMediaUploadFailures(failures []mediaUploadFailure) string {
	if len(failures) == 0 {
		return "none"
	}
	parts := make([]string, 0, len(failures))
	for _, failure := range failures {
		errText := ""
		if failure.Err != nil {
			errText = failure.Err.Error()
		}
		parts = append(parts, fmt.Sprintf("%s [%s]: %s", failure.Key, failure.Stage, errText))
	}
	return strings.Join(parts, "; ")
}

func classifyMediaByExt(fileName string) string {
	switch strings.ToLower(filepath.Ext(fileName)) {
	case ".jpg", ".jpeg", ".png", ".gif", ".webp":
		return "photo"
	case ".mp4", ".mov", ".qt", ".m4v", ".avi", ".webm":
		return "video"
	default:
		return ""
	}
}

func countMediaKind(stats *postMediaStats, kind string) {
	stats.Total++
	switch kind {
	case "photo":
		stats.Photos++
	case "video":
		stats.Videos++
	default:
		stats.Unknown++
	}
}

func collectPostMediaStats(attachmentsRaw string, s3KeysRaw string) postMediaStats {
	var stats postMediaStats

	for _, attachment := range storedAttachmentIDs(attachmentsRaw) {
		countMediaKind(&stats, attachmentKind(attachment))
	}
	for _, key := range parseMediaKeys(s3KeysRaw) {
		countMediaKind(&stats, classifyMediaByExt(key))
	}

	return stats
}

func formatPostCreatedDetails(groupID int, postID int, stats postMediaStats) string {
	return fmt.Sprintf(
		"Group ID: %d, Post ID: %d, Media total: %d, Photo count: %d, Video count: %d, Unknown media count: %d",
		groupID,
		postID,
		stats.Total,
		stats.Photos,
		stats.Videos,
		stats.Unknown,
	)
}

func cleanAttachmentID(attachment string) string {
	attachment = strings.TrimSpace(attachment)
	if attachment == "" {
		return ""
	}
	switch strings.ToLower(attachment) {
	case "null", "undefined":
		return ""
	default:
		return attachment
	}
}

func cleanAttachmentURL(attachmentURL string) string {
	attachmentURL = strings.TrimSpace(attachmentURL)
	switch strings.ToLower(attachmentURL) {
	case "", "null", "undefined":
		return ""
	default:
		return attachmentURL
	}
}

func cleanStoredAttachmentPart(part string) string {
	idAndURL := strings.SplitN(strings.TrimSpace(part), "|", 2)
	attachmentID := cleanAttachmentID(idAndURL[0])
	if attachmentID == "" {
		return ""
	}
	if len(idAndURL) == 2 {
		if attachmentURL := cleanAttachmentURL(idAndURL[1]); attachmentURL != "" {
			return attachmentID + "|" + attachmentURL
		}
	}
	return attachmentID
}

func parseStoredAttachmentParts(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}

	var parts []string
	if strings.HasPrefix(raw, "[") {
		if err := json.Unmarshal([]byte(raw), &parts); err != nil {
			parts = nil
		}
	} else {
		parts = strings.Split(raw, ",")
	}

	cleaned := make([]string, 0, len(parts))
	for _, part := range parts {
		if cleanedPart := cleanStoredAttachmentPart(part); cleanedPart != "" {
			cleaned = append(cleaned, cleanedPart)
		}
	}
	return cleaned
}

func storedAttachmentIDs(raw string) []string {
	parts := parseStoredAttachmentParts(raw)
	ids := make([]string, 0, len(parts))
	for _, part := range parts {
		idAndURL := strings.SplitN(part, "|", 2)
		if attachmentID := cleanAttachmentID(idAndURL[0]); attachmentID != "" {
			ids = append(ids, attachmentID)
		}
	}
	return ids
}

func sanitizeAttachmentIDs(attachments []string) []string {
	cleaned := make([]string, 0, len(attachments))
	for _, attachment := range attachments {
		if attachmentID := cleanAttachmentID(attachment); attachmentID != "" {
			cleaned = append(cleaned, attachmentID)
		}
	}
	return cleaned
}

func attachmentKind(attachment string) string {
	attachment = normalizeAttachmentID(attachment)
	switch {
	case strings.HasPrefix(attachment, "photo"):
		return "photo"
	case strings.HasPrefix(attachment, "video"):
		return "video"
	default:
		return ""
	}
}

func appendAttachmentToPost(post *models.Post, attachment string, attachmentURL string) {
	attachment = cleanAttachmentID(attachment)
	if attachment == "" {
		return
	}
	oldParts := parseStoredAttachmentParts(post.Attachments)
	if attachmentURL = cleanAttachmentURL(attachmentURL); attachmentURL != "" {
		oldParts = append(oldParts, attachment+"|"+attachmentURL)
	} else {
		oldParts = append(oldParts, attachment)
	}
	newAtts, _ := json.Marshal(oldParts)
	post.Attachments = string(newAtts)
}

func wallAttachmentIDs(attachments []vk.Attachment) []string {
	ids := make([]string, 0, len(attachments))
	for _, attachment := range attachments {
		switch attachment.Type {
		case "photo":
			if attachment.Photo != nil {
				ids = append(ids, fmt.Sprintf("photo%d_%d", attachment.Photo.OwnerID, attachment.Photo.ID))
			}
		case "video":
			if attachment.Video != nil {
				ids = append(ids, fmt.Sprintf("video%d_%d", attachment.Video.OwnerID, attachment.Video.ID))
			}
		}
	}
	return ids
}

func normalizeAttachmentID(attachment string) string {
	attachment = cleanAttachmentID(attachment)
	if strings.HasPrefix(attachment, "video") {
		parts := strings.SplitN(attachment, "_", 3)
		if len(parts) >= 2 {
			return parts[0] + "_" + parts[1]
		}
	}
	return attachment
}

func missingAttachmentIDs(expected []string, actual []string) []string {
	expected = sanitizeAttachmentIDs(expected)
	actual = sanitizeAttachmentIDs(actual)
	actualCounts := make(map[string]int, len(actual))
	actualKindCounts := make(map[string]int)
	for _, attachment := range actual {
		normalized := normalizeAttachmentID(attachment)
		if normalized != "" {
			actualCounts[normalized]++
			if kind := attachmentKind(normalized); kind != "" {
				actualKindCounts[kind]++
			}
		}
	}

	var missing []string
	for _, attachment := range expected {
		normalized := normalizeAttachmentID(attachment)
		if normalized == "" {
			continue
		}
		if actualCounts[normalized] > 0 {
			actualCounts[normalized]--
			if kind := attachmentKind(normalized); kind != "" && actualKindCounts[kind] > 0 {
				actualKindCounts[kind]--
			}
			continue
		}

		// VK может заменить ID фотографии при публикации на стену сообщества.
		// Для фото считаем достаточным совпадение количества, для видео оставляем точный ID.
		if attachmentKind(normalized) == "photo" && actualKindCounts["photo"] > 0 {
			actualKindCounts["photo"]--
			continue
		}

		missing = append(missing, attachment)
	}
	return missing
}

func verifyWallAttachments(client *vk.VKClient, ownerID string, postID int, expected []string) ([]string, []string, error) {
	expected = sanitizeAttachmentIDs(expected)
	if len(expected) == 0 {
		return nil, nil, nil
	}

	resp, err := client.WallGetById(fmt.Sprintf("%s_%d", ownerID, postID), false)
	if err != nil {
		return nil, nil, err
	}
	if resp == nil || len(resp.Items) == 0 {
		return nil, expected, fmt.Errorf("wall.getById returned no items for %s_%d", ownerID, postID)
	}

	actual := wallAttachmentIDs(resp.Items[0].Attachments)
	return actual, missingAttachmentIDs(expected, actual), nil
}

func verifyWallAttachmentsWithRetry(client *vk.VKClient, ownerID string, postID int, expected []string, delays []time.Duration) wallAttachmentVerification {
	var result wallAttachmentVerification
	for attempt := 0; ; attempt++ {
		if attempt > 0 {
			time.Sleep(delays[attempt-1])
		}

		actual, missing, err := verifyWallAttachments(client, ownerID, postID, expected)
		result = wallAttachmentVerification{
			Actual:   actual,
			Missing:  missing,
			Err:      err,
			Attempts: attempt + 1,
		}

		if err == nil && len(missing) == 0 {
			return result
		}
		if attempt >= len(delays) {
			return result
		}
	}
}

func safeMediaSuffix(fileName string, contentType string) string {
	ext := strings.ToLower(filepath.Ext(fileName))
	if strings.HasPrefix(contentType, "video/") {
		switch ext {
		case ".mp4", ".mov", ".qt", ".m4v", ".avi", ".webm":
			return "video" + ext
		default:
			return "video.mp4"
		}
	}
	if strings.HasPrefix(contentType, "image/") {
		switch ext {
		case ".jpg", ".jpeg", ".png", ".gif", ".webp":
			return "image" + ext
		default:
			return "image.jpg"
		}
	}
	return "file"
}

type groupSummary struct {
	ID         int    `json:"id"`
	VKGroupID  int    `json:"vk_group_id"`
	Name       string `json:"name"`
	ScreenName string `json:"screen_name"`
	Photo200   string `json:"photo_200"`
}

type groupSettingsResponse struct {
	ID              int        `json:"id"`
	VKGroupID       int        `json:"vk_group_id"`
	Name            string     `json:"name"`
	ScreenName      string     `json:"screen_name"`
	Photo200        string     `json:"photo_200"`
	CityID          *int       `json:"city_id"`
	CityTitle       *string    `json:"city_title"`
	IsActive        bool       `json:"is_active"`
	HasToken        bool       `json:"has_token"`
	NotifyUserIDs   []int      `json:"notify_user_ids"`
	PostTypes       []PostType `json:"post_types"`
	EnablePostTypes bool       `json:"enable_post_types"`
}

type PostTypeField struct {
	ID       string   `json:"id"`
	Label    string   `json:"label"`
	Type     string   `json:"type"` // "string", "link", "number", "phone", "select", "boolean"
	Required bool     `json:"required"`
	Options  []string `json:"options,omitempty"` // Для типа "select" - список вариантов выбора
}

type PostType struct {
	ID           string          `json:"id"`
	Label        string          `json:"label"`
	Color        string          `json:"color"`
	ModeratorIDs []int           `json:"moderator_ids"`
	Fields       []PostTypeField `json:"fields,omitempty"`
	Template     string          `json:"template,omitempty"`
}

type userSummary struct {
	ID        int     `json:"id"`
	VKUserID  int     `json:"vk_user_id"`
	FirstName string  `json:"first_name"`
	LastName  string  `json:"last_name"`
	Photo200  string  `json:"photo_200"`
	CityID    *int    `json:"city_id"`
	CityTitle *string `json:"city_title"`
	Role      string  `json:"role"`
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

func usersMeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPatch {
		updateUserProfileHandler(w, r)
		return
	}
	if r.Method == http.MethodGet {
		syncUserHandler(w, r)
		return
	}
	utils.RespondError(w, http.StatusMethodNotAllowed, "method not allowed")
}

func updateUserProfileHandler(w http.ResponseWriter, r *http.Request) {
	ctx, err := parseLaunchContext(r)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	user, err := getUserByVKUserID(ctx.UserID)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if user == nil {
		utils.RespondError(w, http.StatusNotFound, "user not found")
		return
	}

	var req struct {
		CityID    *int    `json:"city_id"`
		CityTitle *string `json:"city_title"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	user.CityID = req.CityID
	user.CityTitle = req.CityTitle

	if err := updateUser(user); err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(w, userToSummary(user))
}

func syncUserHandler(w http.ResponseWriter, r *http.Request) {
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
	user, err := upsertUser(ctx.UserID, q.Get("firstName"), q.Get("lastName"), q.Get("photo200"), q.Get("cityId"), q.Get("cityTitle"))
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
	ctx, err := parseLaunchContext(r)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}
	if ctx.GroupID == 0 {
		// Если приложение открыто не из группы, просто возвращаем пустой список (без ошибок)
		utils.RespondSuccess(w, []interface{}{})
		return
	}

	group, err := ensureGroup(ctx.GroupID)
	if err != nil || group == nil {
		utils.RespondError(w, http.StatusInternalServerError, "failed to get group")
		return
	}

	status := strings.TrimSpace(r.URL.Query().Get("status"))
	if status == "" {
		status = "published"
	}

	posts, err := getPostsByStatusAndGroup(status, group.ID, 100, 0)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	response, err := serializePosts(posts, group.ID)
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
					cleaned := cleanStoredAttachmentPart(part)
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

	postTypeID := r.FormValue("post_type_id")
	customFields := r.FormValue("custom_fields")

	attachmentsBytes, _ := json.Marshal(uploadedAttachments)
	post := &models.Post{
		UserID:      user.ID,
		Message:     message,
		Attachments: string(attachmentsBytes),
		S3VideoKey:  s3KeysStr,
	}
	if err := createPost(post, group.ID, "pending", postTypeID, customFields); err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	appURL := fmt.Sprintf("https://vk.com/app%s_-%d#/post_detail/%d", config.Load().VKMiniAppID, group.VKGroupID, post.ID)
	moderationURL := fmt.Sprintf("https://vk.com/app%s_-%d#/moderation_detail/%d", config.Load().VKMiniAppID, group.VKGroupID, post.ID)

	sendPostCreatedNotifications(
		group.ID,
		post.ID,
		user.ID,
		ctx.UserID,
		fmt.Sprintf("Ваш пост отправлен на модерацию. Мы сообщим, когда он будет опубликован.\n\n[%s|Проверить статус]", appURL),
		fmt.Sprintf("Пользователь %s %s предложил новый пост в группу \"%s\". Проверьте панель модерации!\n\n[%s|Перейти к модерации поста]", user.FirstName, user.LastName, group.Name, moderationURL),
	)

	mediaStats := collectPostMediaStats(post.Attachments, post.S3VideoKey)
	models.LogInfo("POST_CREATED", "Пользователь предложил новую запись", &user.ID, formatPostCreatedDetails(group.ID, post.ID, mediaStats))

	response, err := serializePost(post, group.ID, nil)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	utils.RespondSuccess(w, response)
}

func suggestExistingPostHandler(w http.ResponseWriter, r *http.Request, postID int) {
	if r.Method != http.MethodPost {
		utils.RespondError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	ctx, err := parseLaunchContext(r)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	group, err := ensureGroup(ctx.GroupID)
	if err != nil || group == nil {
		utils.RespondError(w, http.StatusInternalServerError, "failed to ensure group")
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

	user, err := getUserByVKUserID(ctx.UserID)
	if err != nil || user == nil {
		utils.RespondError(w, http.StatusForbidden, "user not synced")
		return
	}

	if post.UserID != 0 && post.UserID != user.ID {
		utils.RespondError(w, http.StatusForbidden, "Only the author can suggest this post to another group")
		return
	}

	for _, pub := range post.Publications {
		if pub.GroupID == group.ID {
			utils.RespondError(w, http.StatusBadRequest, "Post is already submitted to this community")
			return
		}
	}

	// Опционально парсим форму, если она есть
	r.ParseMultipartForm(10 << 20)
	postTypeID := r.FormValue("post_type_id")
	customFields := r.FormValue("custom_fields")

	pub := &models.PostPublication{
		PostID:       post.ID,
		GroupID:      group.ID,
		Status:       "pending",
		PostTypeID:   postTypeID,
		CustomFields: customFields,
	}

	if err := createPublication(pub); err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	appURL := fmt.Sprintf("https://vk.com/app%s_-%d#/post_detail/%d", config.Load().VKMiniAppID, group.VKGroupID, post.ID)
	moderationURL := fmt.Sprintf("https://vk.com/app%s_-%d#/moderation_detail/%d", config.Load().VKMiniAppID, group.VKGroupID, post.ID)

	sendPostCreatedNotifications(
		group.ID,
		post.ID,
		user.ID,
		ctx.UserID,
		fmt.Sprintf("Ваш пост отправлен на модерацию в новое сообщество. Мы сообщим, когда он будет опубликован.\n\n[%s|Проверить статус]", appURL),
		fmt.Sprintf("Пользователь %s %s предложил существующий пост в группу \"%s\". Проверьте панель модерации!\n\n[%s|Перейти к модерации поста]", user.FirstName, user.LastName, group.Name, moderationURL),
	)

	mediaStats := collectPostMediaStats(post.Attachments, post.S3VideoKey)
	models.LogInfo("POST_CREATED", "Пользователь предложил запись в новое сообщество", &user.ID, formatPostCreatedDetails(group.ID, post.ID, mediaStats))

	response, err := serializePost(post, group.ID, nil)
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

	if ctx.GroupID == 0 {
		utils.RespondSuccess(w, []interface{}{})
		return
	}

	group, err := ensureGroup(ctx.GroupID)
	if err != nil || group == nil {
		utils.RespondError(w, http.StatusInternalServerError, "failed to get group")
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

	response, err := serializePosts(posts, group.ID)
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
			getPostByIDHandler(w, r, postID)
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

	if len(parts) == 2 && parts[1] == "suggest" {
		suggestExistingPostHandler(w, r, postID)
		return
	}

	utils.RespondError(w, http.StatusNotFound, "route not found")
}

func getPostByIDHandler(w http.ResponseWriter, r *http.Request, postID int) {
	ctx, _ := parseLaunchContext(r) // Try to get context, it's fine if it fails

	post, err := getPostByID(postID)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if post == nil {
		utils.RespondError(w, http.StatusNotFound, "post not found")
		return
	}

	groupID := 0
	if ctx != nil {
		groupID = ctx.GroupID
	}

	response, err := serializePost(post, groupID, nil)
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

	// Правильно определяем автора: ищем пользователя в БД по VK user ID,
	// затем сравниваем его внутренний DB ID с post.UserID
	isAuthor := false
	if ctx.UserID > 0 {
		if dbUser, err := getUserByVKUserID(ctx.UserID); err == nil && dbUser != nil {
			isAuthor = (post.UserID == dbUser.ID)
		}
	}

	isMod := isModerator(ctx.GroupRole)

	var group *models.Group
	var currentPub *models.PostPublication

	if ctx.GroupID > 0 {
		var err error
		group, err = ensureGroup(ctx.GroupID)
		if err == nil && group != nil {
			for i, pub := range post.Publications {
				if pub.GroupID == group.ID {
					currentPub = &post.Publications[i]
					break
				}
			}
		}
	}

	if !isAuthor {
		// Для не-авторов обязательно нужна роль модератора или выше
		if !isMod {
			utils.RespondError(w, http.StatusForbidden, "only author or moderator can edit the post")
			return
		}

		// Модератор должен быть привязан к группе
		if group == nil {
			utils.RespondError(w, http.StatusInternalServerError, "failed to get group")
			return
		}

		// Если у поста нет публикации в этой группе — проверяем, есть ли она вообще
		// (модератор может редактировать пост, у которого ещё нет publication в его группе)
		if currentPub != nil {
			if currentPub.Status != "pending" && currentPub.Status != "draft" && currentPub.Status != "rejected" {
				utils.RespondError(w, http.StatusForbidden, "can only edit pending, draft or rejected posts")
				return
			}
		}
	}

	var req struct {
		Message      string   `json:"message"`
		PostTypeID   string   `json:"post_type_id"`
		CustomFields string   `json:"custom_fields"`
		S3VideoKeys  []string `json:"s3_video_keys"`
		Attachments  string   `json:"attachments"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	post.Message = req.Message
	if req.S3VideoKeys != nil {
		post.S3VideoKey = strings.Join(req.S3VideoKeys, ",")
	}
	if strings.TrimSpace(req.Attachments) != "" {
		cleanedAttachments := parseStoredAttachmentParts(req.Attachments)
		attachmentsBytes, _ := json.Marshal(cleanedAttachments)
		post.Attachments = string(attachmentsBytes)
	} else {
		post.Attachments = ""
	}

	if err := updatePost(post); err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if currentPub != nil {
		// Update publication custom fields
		currentPub.PostTypeID = req.PostTypeID
		currentPub.CustomFields = req.CustomFields

		wasRejected := currentPub.Status == "rejected"
		if wasRejected {
			currentPub.Status = "pending"
			currentPub.RejectReason = ""
		}

		// Update publication even if not rejected to save new custom fields
		if err := updatePublication(currentPub); err != nil {
			utils.RespondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		if wasRejected {
			g, err := getGroupByID(currentPub.GroupID)
			if err == nil && g != nil {
				moderationURL := fmt.Sprintf("https://vk.com/app%s_-%d#/moderation_detail/%d", config.Load().VKMiniAppID, g.VKGroupID, post.ID)

				user, userErr := getUserByVKUserID(ctx.UserID)
				if userErr == nil && user != nil {
					sendNotificationToAdmins(g.ID, fmt.Sprintf("Пользователь %s %s обновил отклоненный пост в группе \"%s\". Он снова отправлен на модерацию.\n\n[%s|Перейти к модерации поста]", user.FirstName, user.LastName, g.Name, moderationURL))
				} else {
					sendNotificationToAdmins(g.ID, fmt.Sprintf("Пользователь обновил отклоненный пост в группе \"%s\". Он снова отправлен на модерацию.\n\n[%s|Перейти к модерации поста]", g.Name, moderationURL))
				}
			}
		}
	}

	groupID := 0
	if group != nil {
		groupID = group.ID
	}
	response, err := serializePost(post, groupID, nil)
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

	group, err := ensureGroup(ctx.GroupID)
	if err != nil || group == nil {
		utils.RespondError(w, http.StatusInternalServerError, "failed to get group")
		return
	}

	var currentPub *models.PostPublication
	for i, pub := range post.Publications {
		if pub.GroupID == group.ID {
			currentPub = &post.Publications[i]
			break
		}
	}
	if currentPub == nil {
		utils.RespondError(w, http.StatusForbidden, "post belongs to a different community")
		return
	}

	if currentPub.Status != "pending" {
		utils.RespondError(w, http.StatusBadRequest, "post is already moderated")
		return
	}

	appURL := fmt.Sprintf("https://vk.com/app%s_-%d#/post_detail/%d", config.Load().VKMiniAppID, group.VKGroupID, post.ID)

	if req.Status == "rejected" {
		currentPub.Status = "rejected"
		currentPub.RejectReason = req.RejectReason
		currentPub.PublishDate = time.Time{}

		if err := updatePublication(currentPub); err != nil {
			utils.RespondError(w, http.StatusInternalServerError, err.Error())
			return
		}

		if author, err := getUserByID(post.UserID); err == nil && author != nil {
			rejectMsg := "К сожалению, ваш предложенный пост был отклонен модератором."
			if currentPub.RejectReason != "" {
				rejectMsg += fmt.Sprintf("\nПричина: %s", currentPub.RejectReason)
			}
			rejectMsg += fmt.Sprintf("\n\n[%s|Посмотреть детали]", appURL)
			sendNotificationToUser(author.VKUserID, rejectMsg)
		}

		utils.RespondSuccess(w, map[string]interface{}{"success": true, "status": req.Status})
		return
	}

	if req.Status != "published" && req.Status != "scheduled" {
		utils.RespondError(w, http.StatusBadRequest, "unsupported status")
		return
	}

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
		currentPub.PublishDate = publishDate
		publishUnix = publishDate.Unix()
	} else {
		currentPub.PublishDate = time.Time{}
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

	// Устанавливаем статус processing, чтобы предотвратить дублирование запросов
	// если пользователь нажмет кнопку несколько раз подряд.
	currentPub.Status = "processing"
	if err := updatePublication(currentPub); err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "failed to set processing status")
		return
	}

	// Immediately return success so API Gateway doesn't timeout
	utils.RespondSuccess(w, map[string]interface{}{"success": true, "status": req.Status})

	go func() {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("[Moderate] Panic in async moderation: %v", r)
			}
		}()

		client := vk.NewVKClient(adminToken)
		attachments := storedAttachmentIDs(post.Attachments)

		// Считаем сколько медиа ожидается из S3 и сохраняем список ключей,
		// чтобы при частичной загрузке точно знать, какие файлы нужно догрузить.
		s3Keys := parseMediaKeys(post.S3VideoKey)
		remainingS3Keys := append([]string(nil), s3Keys...)
		expectedS3Count := len(s3Keys)
		uploadedFromS3Count := 0
		var mediaFailures []mediaUploadFailure

		// Если есть медиа в S3 - скачиваем и загружаем в VK
		if len(s3Keys) > 0 {
			s3, err := s3client.New()
			if err != nil {
				log.Printf("[Moderate] S3 client init failed before media upload: %v", err)
				for _, key := range s3Keys {
					mediaFailures = append(mediaFailures, mediaUploadFailure{Key: key, Stage: "s3_init", Err: err})
				}
			} else {
				for _, key := range s3Keys {
					log.Printf("[Moderate] Downloading S3 media: %s", key)

					// Retry loop: до 3 попыток на каждый файл
					const maxRetries = 3
					var uploadedOK bool
					lastFailure := mediaUploadFailure{Key: key, Stage: "unknown", Err: fmt.Errorf("upload was not attempted")}

					for attempt := 1; attempt <= maxRetries; attempt++ {
						rc, objectSize, err := s3.GetObject(context.Background(), key)
						if err != nil {
							lastFailure = mediaUploadFailure{Key: key, Stage: "s3_get_object", Err: err}
							log.Printf("[Moderate] S3 GetObject attempt %d/%d failed for %s: %v", attempt, maxRetries, key, err)
							continue
						}

						var att, attURL string
						var uploadErr error
						ext := strings.ToLower(filepath.Ext(key))
						log.Printf("[Moderate] S3 media object ready: key=%s size=%d ext=%s", key, objectSize, ext)

						tmpFile, err := os.CreateTemp("", "moderation_media_*"+ext)
						if err != nil {
							rc.Close()
							lastFailure = mediaUploadFailure{Key: key, Stage: "temp_file", Err: err}
							log.Printf("[Moderate] TempFile create failed: %v", err)
							continue
						}

						if _, err := io.Copy(tmpFile, rc); err != nil {
							tmpPath := tmpFile.Name()
							tmpFile.Close()
							rc.Close()
							os.Remove(tmpPath)
							lastFailure = mediaUploadFailure{Key: key, Stage: "temp_file_copy", Err: err}
							log.Printf("[Moderate] TempFile copy failed for %s: %v", key, err)
							continue
						}
						tmpPath := tmpFile.Name()
						tmpFile.Close()
						rc.Close()

						if ext == ".mp4" || ext == ".mov" || ext == ".qt" {
							att, attURL, uploadErr = client.UploadVideo(tmpPath, strconv.Itoa(group.VKGroupID), filepath.Base(key))
						} else {
							att, attURL, uploadErr = client.UploadPhotoToWall(tmpPath, strconv.Itoa(group.VKGroupID))
						}
						os.Remove(tmpPath)

						if uploadErr != nil {
							lastFailure = mediaUploadFailure{Key: key, Stage: "vk_upload", Err: uploadErr}
							log.Printf("[Moderate] VK upload attempt %d/%d failed for %s: %v", attempt, maxRetries, key, uploadErr)
							continue
						}

						// Успешно загружено в VK
						att = cleanAttachmentID(att)
						if att == "" {
							lastFailure = mediaUploadFailure{Key: key, Stage: "vk_upload", Err: fmt.Errorf("VK returned empty attachment id")}
							log.Printf("[Moderate] VK upload attempt %d/%d returned empty attachment for %s", attempt, maxRetries, key)
							continue
						}
						attachments = append(attachments, att)
						appendAttachmentToPost(post, att, attURL)

						go s3DeleteVideoKey(key)
						remainingS3Keys = removeMediaKey(remainingS3Keys, key)
						uploadedOK = true
						uploadedFromS3Count++
						break // выход из retry loop
					}

					if !uploadedOK {
						mediaFailures = append(mediaFailures, lastFailure)
						log.Printf("[Moderate] ❌ Media integrity FAIL: could not upload %s after %d attempts. Last error: %v", key, maxRetries, lastFailure.Err)
					}
				}
			}
			post.S3VideoKey = strings.Join(remainingS3Keys, ",")
		}

		// ✅ Проверка целостности медиа
		// Если часть медиа не загрузилась → публикуем с тем что есть,
		// затем догружаем остальное через wall.edit (publish-then-patch)
		hasPartialMedia := expectedS3Count > 0 && uploadedFromS3Count < expectedS3Count
		if hasPartialMedia {
			missingCount := expectedS3Count - uploadedFromS3Count
			log.Printf("[Moderate] ⚠️ Partial media upload for post %d: expected %d, uploaded %d (%d missing). Remaining S3 keys: %s. Will publish and patch via wall.edit.",
				post.ID, expectedS3Count, uploadedFromS3Count, missingCount, strings.Join(remainingS3Keys, ","))
			models.LogWarning("MEDIA_PARTIAL_UPLOAD",
				fmt.Sprintf("Часть медиа (%d из %d) не загрузилась с первого раза. Публикуем с тем что есть, остальное догрузим через wall.edit", uploadedFromS3Count, expectedS3Count),
				nil,
				fmt.Sprintf("Post ID: %d, Group ID: %d, Expected: %d, Uploaded: %d, Missing S3 keys: %s, Failures: %s",
					post.ID, group.ID, expectedS3Count, uploadedFromS3Count, strings.Join(remainingS3Keys, ","), formatMediaUploadFailures(mediaFailures)),
			)
		}

		attachments = sanitizeAttachmentIDs(attachments)
		messageToPost := post.Message

		var authorLink string
		var authorName string
		if post.UserID != 0 {
			author, err := getUserByID(post.UserID)
			if err == nil && author != nil {
				authorLink = fmt.Sprintf("@id%d (%s %s)", author.VKUserID, author.FirstName, author.LastName)
				authorName = fmt.Sprintf("%s %s", author.FirstName, author.LastName)
			}
		}

		if group.EnablePostTypes && currentPub.PostTypeID != "" && currentPub.CustomFields != "" {
			var postTypes []struct {
				ID       string `json:"id"`
				Label    string `json:"label"`
				Template string `json:"template"`
			}
			json.Unmarshal([]byte(group.PostTypes), &postTypes)

			var selectedType *struct {
				ID       string `json:"id"`
				Label    string `json:"label"`
				Template string `json:"template"`
			}
			for _, pt := range postTypes {
				if pt.ID == currentPub.PostTypeID {
					selectedType = &pt
					break
				}
			}

			var fields []struct {
				ID      string `json:"id"`
				Label   string `json:"label"`
				VarName string `json:"var_name"`
				Value   string `json:"value"`
			}
			json.Unmarshal([]byte(currentPub.CustomFields), &fields)

			if selectedType != nil && selectedType.Template != "" {
				compiled := selectedType.Template
				compiled = strings.ReplaceAll(compiled, "{text}", messageToPost)
				compiled = strings.ReplaceAll(compiled, "{author_name}", authorName)
				compiled = strings.ReplaceAll(compiled, "{author_link}", authorLink)
				compiled = strings.ReplaceAll(compiled, "{date}", time.Now().Format("02.01.2006"))

				for _, f := range fields {
					compiled = strings.ReplaceAll(compiled, "{"+f.VarName+"}", f.Value)
					compiled = strings.ReplaceAll(compiled, "{"+f.ID+"}", f.Value)
				}
				messageToPost = compiled
			} else {
				var fieldsText string
				if selectedType != nil {
					fieldsText = fmt.Sprintf("[Категория: %s]\n", selectedType.Label)
				}
				for _, f := range fields {
					fieldsText += fmt.Sprintf("%s: %s\n", f.Label, f.Value)
				}
				messageToPost = fmt.Sprintf("%s\n\n%s", messageToPost, strings.TrimSpace(fieldsText))

				if authorLink != "" {
					messageToPost += fmt.Sprintf("\n\nАвтор: %s", authorLink)
				}
			}
		} else {
			if authorLink != "" {
				messageToPost += fmt.Sprintf("\n\nАвтор: %s", authorLink)
			}
		}

		var vkPostID int
		var err error
		ownerID := "-" + strconv.Itoa(group.VKGroupID)
		if os.Getenv("IS_TESTING") == "true" {
			vkPostID = 99999
		} else {
			vkPostID, err = client.WallPost(ownerID, messageToPost, attachments, true, publishUnix)
		}

		if err != nil {
			log.Printf("[Moderate] VK wall.post error for group %d: %v", group.VKGroupID, err)
			models.LogWarning("PUBLISH_FAILED", "Не удалось опубликовать запись во ВКонтакте", nil, fmt.Sprintf("Group ID: %d, Post ID: %d, Error: %v", group.VKGroupID, post.ID, err))

			currentPub.Status = "pending"
			updatePublication(currentPub)
			return
		}

		if os.Getenv("IS_TESTING") != "true" && req.Status == "published" && len(attachments) > 0 {
			verifyResult := verifyWallAttachmentsWithRetry(client, ownerID, vkPostID, attachments, mediaVerifyRetryDelays)
			actualAttachments := verifyResult.Actual
			missingAttachments := verifyResult.Missing
			verifyErr := verifyResult.Err
			if verifyErr != nil {
				log.Printf("[MediaVerify] ⚠️ Could not verify VK post %d attachments after %d checks: %v", vkPostID, verifyResult.Attempts, verifyErr)
				models.LogWarning("MEDIA_VERIFY_FAILED",
					"Не удалось проверить, все ли медиа появились в опубликованном посте",
					nil,
					fmt.Sprintf("Post ID: %d, VK Post ID: %d, Attempts: %d, Expected attachments: %s, Error: %v",
						post.ID, vkPostID, verifyResult.Attempts, strings.Join(attachments, ","), verifyErr),
				)
			} else if len(missingAttachments) > 0 {
				log.Printf("[MediaVerify] ⚠️ VK post %d is missing attachments after wall.post and %d checks: expected=%s actual=%s missing=%s",
					vkPostID, verifyResult.Attempts, strings.Join(attachments, ","), strings.Join(actualAttachments, ","), strings.Join(missingAttachments, ","))
				models.LogWarning("MEDIA_VERIFY_MISSING",
					"VK опубликовал пост, но после ожидания часть вложений не найдена на стене. Пробуем восстановить через wall.edit",
					nil,
					fmt.Sprintf("Post ID: %d, VK Post ID: %d, Attempts: %d, Expected attachments: %s, Actual attachments: %s, Missing attachments: %s",
						post.ID, vkPostID, verifyResult.Attempts, strings.Join(attachments, ","), strings.Join(actualAttachments, ","), strings.Join(missingAttachments, ",")),
				)

				if editErr := client.WallEdit(ownerID, vkPostID, messageToPost, attachments); editErr != nil {
					log.Printf("[MediaVerify] ❌ wall.edit repair failed for VK post %d: %v", vkPostID, editErr)
					models.LogWarning("MEDIA_VERIFY_REPAIR_FAILED",
						"wall.edit не смог восстановить отсутствующие вложения после проверки",
						nil,
						fmt.Sprintf("Post ID: %d, VK Post ID: %d, Missing attachments: %s, Error: %v", post.ID, vkPostID, strings.Join(missingAttachments, ","), editErr),
					)
				} else {
					repairResult := verifyWallAttachmentsWithRetry(client, ownerID, vkPostID, attachments, mediaVerifyRetryDelays)
					actualAfterRepair := repairResult.Actual
					missingAfterRepair := repairResult.Missing
					repairVerifyErr := repairResult.Err
					if repairVerifyErr != nil {
						log.Printf("[MediaVerify] ⚠️ Could not verify wall.edit repair for VK post %d after %d checks: %v", vkPostID, repairResult.Attempts, repairVerifyErr)
						models.LogWarning("MEDIA_VERIFY_REPAIR_CHECK_FAILED",
							"wall.edit выполнен, но повторная проверка вложений не удалась",
							nil,
							fmt.Sprintf("Post ID: %d, VK Post ID: %d, Attempts: %d, Error: %v", post.ID, vkPostID, repairResult.Attempts, repairVerifyErr),
						)
					} else if len(missingAfterRepair) > 0 {
						log.Printf("[MediaVerify] ❌ VK post %d still missing attachments after wall.edit and %d checks: actual=%s missing=%s",
							vkPostID, repairResult.Attempts, strings.Join(actualAfterRepair, ","), strings.Join(missingAfterRepair, ","))
						models.LogWarning("MEDIA_VERIFY_REPAIR_INCOMPLETE",
							"После wall.edit и повторного ожидания часть вложений всё ещё отсутствует на стене",
							nil,
							fmt.Sprintf("Post ID: %d, VK Post ID: %d, Attempts: %d, Actual attachments: %s, Missing attachments: %s",
								post.ID, vkPostID, repairResult.Attempts, strings.Join(actualAfterRepair, ","), strings.Join(missingAfterRepair, ",")),
						)
					} else {
						log.Printf("[MediaVerify] ✅ VK post %d attachments repaired via wall.edit after %d checks", vkPostID, repairResult.Attempts)
						models.LogInfo("MEDIA_VERIFY_REPAIR_SUCCESS",
							"Отсутствующие вложения восстановлены через wall.edit",
							nil,
							fmt.Sprintf("Post ID: %d, VK Post ID: %d, Attempts: %d, Attachments: %s", post.ID, vkPostID, repairResult.Attempts, strings.Join(attachments, ",")),
						)
					}
				}
			} else {
				log.Printf("[MediaVerify] ✅ VK post %d has all expected attachments after %d checks: %s", vkPostID, verifyResult.Attempts, strings.Join(attachments, ","))
				if hasPartialMedia {
					models.LogInfo("MEDIA_VERIFY_PARTIAL_OK",
						"Проверили опубликованную часть медиа. Оставшиеся файлы будут догружены через wall.edit",
						nil,
						fmt.Sprintf("Post ID: %d, VK Post ID: %d, Attempts: %d, Published attachments: %s, Remaining S3 keys: %s",
							post.ID, vkPostID, verifyResult.Attempts, strings.Join(attachments, ","), strings.Join(remainingS3Keys, ",")),
					)
				} else {
					models.LogInfo("MEDIA_VERIFY_OK",
						"Проверка медиа после публикации прошла успешно",
						nil,
						fmt.Sprintf("Post ID: %d, VK Post ID: %d, Attempts: %d, Attachments: %s", post.ID, vkPostID, verifyResult.Attempts, strings.Join(attachments, ",")),
					)
				}
			}
		}

		currentPub.VKPostID = vkPostID
		currentPub.Status = req.Status
		if err := updatePublication(currentPub); err != nil {
			log.Printf("[Moderate] Failed to update publication: %v\n", err)
			return
		}

		post.Message = messageToPost
		if err := updatePost(post); err != nil {
			log.Printf("[Moderate] Failed to update post: %v\n", err)
			return
		}

		models.LogInfo("POST_PUBLISHED", "Запись успешно опубликована на стене сообщества", nil, fmt.Sprintf("Group ID: %d, Post ID: %d, VK Post ID: %d", group.ID, post.ID, vkPostID))

		if author, err := getUserByID(post.UserID); err == nil && author != nil {
			switch req.Status {
			case "published":
				sendNotificationToUser(author.VKUserID, fmt.Sprintf("Ваш предложенный пост был успешно опубликован!\n\n[%s|Открыть пост]", appURL))
			case "scheduled":
				sendNotificationToUser(author.VKUserID, fmt.Sprintf("Ваш предложенный пост поставлен в очередь на публикацию: %s\n\n[%s|Открыть пост]", currentPub.PublishDate.Format("02.01.2006 15:04"), appURL))
			}
		}

		// Если часть медиа не загрузилась — пытаемся догрузить в фоне и обновить пост через wall.edit
		if hasPartialMedia && post.S3VideoKey != "" && vkPostID > 0 {
			remainingKeys := post.S3VideoKey
			capturedVKPostID := vkPostID
			capturedGroupID := group.VKGroupID
			capturedPostID := post.ID
			capturedMessage := messageToPost
			capturedAttachments := make([]string, len(attachments))
			copy(capturedAttachments, attachments)

			go func() {
				defer func() {
					if r := recover(); r != nil {
						log.Printf("[PatchMedia] Panic: %v", r)
					}
				}()

				s3, err := s3client.New()
				if err != nil {
					log.Printf("[PatchMedia] Failed to init S3 client: %v", err)
					models.LogWarning("MEDIA_PATCH_FAILED",
						"Не удалось начать догрузку медиа через wall.edit: S3 недоступен",
						nil,
						fmt.Sprintf("Post ID: %d, VK Post ID: %d, Missing S3 keys: %s, Error: %v", capturedPostID, capturedVKPostID, remainingKeys, err),
					)
					return
				}

				patchClient := vk.NewVKClient(adminToken)
				var newAttachments []string
				type recoveredMedia struct {
					Key           string
					Attachment    string
					AttachmentURL string
				}
				var recoveredMediaFiles []recoveredMedia
				var patchFailures []mediaUploadFailure
				remainingPatchKeys := parseMediaKeys(remainingKeys)

				for _, key := range remainingPatchKeys {
					const patchMaxRetries = 5
					var uploadedOK bool
					lastFailure := mediaUploadFailure{Key: key, Stage: "unknown", Err: fmt.Errorf("patch upload was not attempted")}

					for attempt := 1; attempt <= patchMaxRetries; attempt++ {
						// Экспоненциальная задержка между попытками: 2, 4, 8, 16, 32 сек
						if attempt > 1 {
							time.Sleep(time.Duration(1<<uint(attempt)) * time.Second)
						}

						log.Printf("[PatchMedia] Attempt %d/%d uploading missed media %s for VK post %d", attempt, patchMaxRetries, key, capturedVKPostID)

						rc, objectSize, err := s3.GetObject(context.Background(), key)
						if err != nil {
							lastFailure = mediaUploadFailure{Key: key, Stage: "s3_get_object", Err: err}
							log.Printf("[PatchMedia] S3 GetObject failed: %v", err)
							continue
						}

						ext := strings.ToLower(filepath.Ext(key))
						log.Printf("[PatchMedia] S3 media object ready: key=%s size=%d ext=%s", key, objectSize, ext)
						tmpFile, err := os.CreateTemp("", "patch_media_*"+ext)
						if err != nil {
							rc.Close()
							lastFailure = mediaUploadFailure{Key: key, Stage: "temp_file", Err: err}
							continue
						}
						if _, err := io.Copy(tmpFile, rc); err != nil {
							tmpPath := tmpFile.Name()
							tmpFile.Close()
							rc.Close()
							os.Remove(tmpPath)
							lastFailure = mediaUploadFailure{Key: key, Stage: "temp_file_copy", Err: err}
							continue
						}
						tmpPath := tmpFile.Name()
						tmpFile.Close()
						rc.Close()

						var att, attURL string
						var uploadErr error
						if ext == ".mp4" || ext == ".mov" || ext == ".qt" {
							att, attURL, uploadErr = patchClient.UploadVideo(tmpPath, strconv.Itoa(capturedGroupID), filepath.Base(key))
						} else {
							att, attURL, uploadErr = patchClient.UploadPhotoToWall(tmpPath, strconv.Itoa(capturedGroupID))
						}
						os.Remove(tmpPath)

						if uploadErr != nil {
							lastFailure = mediaUploadFailure{Key: key, Stage: "vk_upload", Err: uploadErr}
							log.Printf("[PatchMedia] VK upload attempt %d/%d failed: %v", attempt, patchMaxRetries, uploadErr)
							continue
						}
						att = cleanAttachmentID(att)
						if att == "" {
							lastFailure = mediaUploadFailure{Key: key, Stage: "vk_upload", Err: fmt.Errorf("VK returned empty attachment id")}
							log.Printf("[PatchMedia] VK upload attempt %d/%d returned empty attachment for %s", attempt, patchMaxRetries, key)
							continue
						}

						newAttachments = append(newAttachments, att)
						recoveredMediaFiles = append(recoveredMediaFiles, recoveredMedia{Key: key, Attachment: att, AttachmentURL: attURL})
						go s3DeleteVideoKey(key)
						remainingPatchKeys = removeMediaKey(remainingPatchKeys, key)
						uploadedOK = true
						log.Printf("[PatchMedia] ✅ Successfully uploaded missed media %s", key)
						break
					}

					if !uploadedOK {
						patchFailures = append(patchFailures, lastFailure)
						log.Printf("[PatchMedia] ❌ Failed to recover media %s. Last error: %v", key, lastFailure.Err)
					}
				}

				if len(newAttachments) == 0 {
					log.Printf("[PatchMedia] ❌ No media recovered for VK post %d, patch skipped", capturedVKPostID)
					models.LogWarning("MEDIA_PATCH_FAILED",
						"Не удалось догрузить пропавшие медиафайлы через wall.edit",
						nil,
						fmt.Sprintf("Post ID: %d, VK Post ID: %d, Missing S3 keys: %s, Failures: %s",
							capturedPostID, capturedVKPostID, remainingKeys, formatMediaUploadFailures(patchFailures)),
					)
					return
				}

				// Патчим опубликованный пост — добавляем к существующим вложениям новые
				allAttachments := sanitizeAttachmentIDs(append(capturedAttachments, newAttachments...))
				ownerID := "-" + strconv.Itoa(capturedGroupID)
				if err := patchClient.WallEdit(ownerID, capturedVKPostID, capturedMessage, allAttachments); err != nil {
					log.Printf("[PatchMedia] ❌ wall.edit failed for VK post %d: %v", capturedVKPostID, err)
					models.LogWarning("MEDIA_PATCH_WALL_EDIT_FAILED",
						"wall.edit не удался при попытке дозагрузить медиа в опубликованный пост",
						nil,
						fmt.Sprintf("Post ID: %d, VK Post ID: %d, Error: %v", capturedPostID, capturedVKPostID, err),
					)
					return
				}

				if patchedPost, err := getPostByID(capturedPostID); err == nil && patchedPost != nil {
					for _, recovered := range recoveredMediaFiles {
						appendAttachmentToPost(patchedPost, recovered.Attachment, recovered.AttachmentURL)
					}
					patchedPost.S3VideoKey = strings.Join(remainingPatchKeys, ",")
					if err := updatePost(patchedPost); err != nil {
						log.Printf("[PatchMedia] Failed to persist recovered media state for post %d: %v", capturedPostID, err)
					}
				}

				verifyResult := verifyWallAttachmentsWithRetry(patchClient, ownerID, capturedVKPostID, allAttachments, mediaVerifyRetryDelays)
				actualAttachments := verifyResult.Actual
				missingAttachments := verifyResult.Missing
				verifyErr := verifyResult.Err
				if verifyErr != nil {
					log.Printf("[PatchMedia] ⚠️ Could not verify patched post %d after %d checks: %v", capturedVKPostID, verifyResult.Attempts, verifyErr)
					models.LogWarning("MEDIA_PATCH_VERIFY_FAILED",
						"wall.edit выполнен, но проверка вложений через wall.getById не удалась",
						nil,
						fmt.Sprintf("Post ID: %d, VK Post ID: %d, Attempts: %d, Expected attachments: %s, Error: %v",
							capturedPostID, capturedVKPostID, verifyResult.Attempts, strings.Join(allAttachments, ","), verifyErr),
					)
					return
				}

				if len(missingAttachments) > 0 {
					log.Printf("[PatchMedia] ❌ Post %d still misses media after wall.edit and %d checks: expected=%s actual=%s missing=%s",
						capturedVKPostID, verifyResult.Attempts, strings.Join(allAttachments, ","), strings.Join(actualAttachments, ","), strings.Join(missingAttachments, ","))
					models.LogWarning("MEDIA_PATCH_INCOMPLETE",
						"После wall.edit и повторного ожидания часть медиа всё ещё отсутствует на стене",
						nil,
						fmt.Sprintf("Post ID: %d, VK Post ID: %d, Attempts: %d, Expected attachments: %s, Actual attachments: %s, Missing attachments: %s, Remaining S3 keys: %s, Failures: %s",
							capturedPostID, capturedVKPostID, verifyResult.Attempts, strings.Join(allAttachments, ","), strings.Join(actualAttachments, ","), strings.Join(missingAttachments, ","), strings.Join(remainingPatchKeys, ","), formatMediaUploadFailures(patchFailures)),
					)
					return
				}

				log.Printf("[PatchMedia] ✅ Post %d patched and verified successfully after %d checks: added %d missing media via wall.edit", capturedVKPostID, verifyResult.Attempts, len(newAttachments))
				models.LogInfo("MEDIA_PATCH_SUCCESS",
					fmt.Sprintf("Успешно дозагружено и проверено %d медиафайлов через wall.edit", len(newAttachments)),
					nil,
					fmt.Sprintf("Post ID: %d, VK Post ID: %d, Attempts: %d, Added attachments: %s, Actual attachments: %s, Remaining S3 keys: %s",
						capturedPostID, capturedVKPostID, verifyResult.Attempts, strings.Join(newAttachments, ","), strings.Join(actualAttachments, ","), strings.Join(remainingPatchKeys, ",")),
				)
			}()
		}
	}()
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
			Name            *string     `json:"name"`
			ScreenName      *string     `json:"screen_name"`
			Photo200        *string     `json:"photo_200"`
			CityID          *int        `json:"city_id"`
			CityTitle       *string     `json:"city_title"`
			IsActive        *bool       `json:"is_active"`
			NotifyUserIDs   []int       `json:"notify_user_ids"`
			PostTypes       *[]PostType `json:"post_types"`
			EnablePostTypes *bool       `json:"enable_post_types"`
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
		if req.PostTypes != nil {
			b, _ := json.Marshal(req.PostTypes)
			group.PostTypes = string(b)
		}
		if req.EnablePostTypes != nil {
			group.EnablePostTypes = *req.EnablePostTypes
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

func serializePosts(posts []*models.Post, contextGroupID int) ([]postResponse, error) {
	if len(posts) == 0 {
		return []postResponse{}, nil
	}

	userIDs := make([]int, 0)
	for _, post := range posts {
		if post.UserID != 0 {
			userIDs = append(userIDs, post.UserID)
		}
	}

	usersMap, err := getUsersMapByIDs(userIDs)
	if err != nil {
		return nil, err
	}

	result := make([]postResponse, 0, len(posts))
	for _, post := range posts {
		item, err := serializePost(post, contextGroupID, usersMap)
		if err != nil {
			return nil, err
		}
		result = append(result, item)
	}
	return result, nil
}

func serializePost(post *models.Post, contextGroupID int, usersMap map[int]*models.User) (postResponse, error) {
	var user *models.User

	if post.UserID != 0 && usersMap != nil {
		user = usersMap[post.UserID]
	} else if post.UserID != 0 {
		// Fallback for single post serialization
		var err error
		user, err = getUserByID(post.UserID)
		if err != nil {
			return postResponse{}, err
		}
	}

	response := postResponse{
		ID:          post.ID,
		Title:       makePostTitle(post.Message),
		Message:     post.Message,
		Attachments: post.Attachments,
		S3VideoKey:  post.S3VideoKey,
		CreatedAt:   post.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   post.UpdatedAt.Format(time.RFC3339),
	}

	if user != nil {
		response.Author = userToSummary(user)
	}

	var primaryPub *models.PostPublication
	for i, pub := range post.Publications {
		pubResp := postPublicationResponse{
			ID:           pub.ID,
			GroupID:      pub.GroupID,
			Status:       pub.Status,
			VKPostID:     pub.VKPostID,
			RejectReason: pub.RejectReason,
			PostTypeID:   pub.PostTypeID,
			CustomFields: pub.CustomFields,
			CreatedAt:    pub.CreatedAt.Format(time.RFC3339),
			UpdatedAt:    pub.UpdatedAt.Format(time.RFC3339),
		}
		if !pub.PublishDate.IsZero() {
			pd := pub.PublishDate.Format(time.RFC3339)
			pubResp.PublishDate = &pd
		}

		g, err := getGroupByID(pub.GroupID)
		if err == nil && g != nil {
			pubResp.Group = userFacingGroup(g)
		}

		response.Publications = append(response.Publications, pubResp)

		if contextGroupID > 0 && pub.GroupID == contextGroupID {
			primaryPub = &post.Publications[i]
		}
	}

	if primaryPub == nil && len(post.Publications) > 0 {
		primaryPub = &post.Publications[0]
	}

	if primaryPub != nil {
		response.Status = primaryPub.Status
		response.VKPostID = primaryPub.VKPostID
		response.RejectReason = primaryPub.RejectReason
		if !primaryPub.PublishDate.IsZero() {
			pd := primaryPub.PublishDate.Format(time.RFC3339)
			response.PublishDate = &pd
		}
		g, err := getGroupByID(primaryPub.GroupID)
		if err == nil && g != nil {
			response.Group = userFacingGroup(g)
		}
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
	var videoIDs []string

	// First pass: collect all VK video IDs that need thumbnails
	for _, p := range posts {
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

				if strings.HasPrefix(id, "video") && mediaURL == "" {
					videoIDs = append(videoIDs, id)
				}
			}
		}
	}

	// Batch fetch video thumbnails
	videoThumbnails := make(map[string]string)
	if len(videoIDs) > 0 {
		adminToken, tokenErr := getActiveVKToken()
		if tokenErr == nil && adminToken != "" {
			vkClient := vk.NewVKClient(adminToken)

			// Deduplicate IDs
			uniqueIDs := make(map[string]bool)
			var batch []string
			for _, id := range videoIDs {
				if !uniqueIDs[id] {
					uniqueIDs[id] = true
					batch = append(batch, id)
				}
			}

			if thumbs, err := vkClient.GetVideoThumbnails(batch); err == nil {
				videoThumbnails = thumbs
			} else {
				log.Printf("[populateAttachmentURLs] GetVideoThumbnails failed for %d videos: %v", len(batch), err)
			}
		}
	}

	// Create S3 client exactly once
	var s3 *s3client.Client
	if s3C, err := s3client.New(); err == nil {
		s3 = s3C
	} else {
		log.Printf("[populateAttachmentURLs] S3 not configured: %v", err)
	}

	// Second pass: populate URLs
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
					if mediaURL == "" {
						raw := strings.TrimPrefix(id, "video")
						partsRaw := strings.SplitN(raw, "_", 3)
						if len(partsRaw) >= 2 {
							baseID := fmt.Sprintf("video%s_%s", partsRaw[0], partsRaw[1])
							if t, ok := videoThumbnails[baseID]; ok {
								mediaURL = t
							}
						}
					}
					urls = append(urls, AttachmentURL{ID: id, Type: "vk_video", URL: mediaURL})
				}
			}
		}

		if p.S3VideoKey != "" && s3 != nil {
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
		}

		posts[i].AttachmentURLs = urls
	}
	return posts
}

func groupToSettings(group *models.Group) *groupSettingsResponse {
	if group == nil {
		return nil
	}

	resp := &groupSettingsResponse{
		ID:              group.ID,
		VKGroupID:       group.VKGroupID,
		Name:            group.Name,
		ScreenName:      group.ScreenName,
		Photo200:        group.Photo200,
		CityID:          group.CityID,
		CityTitle:       group.CityTitle,
		IsActive:        group.IsActive,
		HasToken:        group.AccessToken != "",
		EnablePostTypes: group.EnablePostTypes,
	}

	if group.NotifyUserIDs != "" {
		json.Unmarshal([]byte(group.NotifyUserIDs), &resp.NotifyUserIDs)
	}
	if resp.NotifyUserIDs == nil {
		resp.NotifyUserIDs = []int{}
	}

	if group.PostTypes != "" {
		json.Unmarshal([]byte(group.PostTypes), &resp.PostTypes)
	}
	if resp.PostTypes == nil {
		resp.PostTypes = []PostType{}
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
		CityID:    user.CityID,
		CityTitle: user.CityTitle,
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

func upsertUser(vkUserID int, firstName, lastName, photo200, cityIdStr, cityTitleStr string) (*models.User, error) {
	user, err := getUserByVKUserID(vkUserID)
	if err != nil {
		return nil, err
	}

	var cityID *int
	if cityIdStr != "" {
		if id, err := strconv.Atoi(cityIdStr); err == nil {
			cityID = &id
		}
	}
	var cityTitle *string
	if cityTitleStr != "" {
		cityTitle = &cityTitleStr
	}

	if user == nil {
		user = &models.User{
			VKUserID:  vkUserID,
			FirstName: firstName,
			LastName:  lastName,
			Photo200:  photo200,
			CityID:    cityID,
			CityTitle: cityTitle,
			Role:      "user",
		}
		if err := createUser(user); err != nil {
			return nil, err
		}
		return user, nil
	}

	needsUpdate := user.FirstName != firstName || user.LastName != lastName || user.Photo200 != photo200

	// Если с VK пришел город, а у пользователя он не установлен - сохраняем
	if cityID != nil && user.CityID == nil {
		user.CityID = cityID
		user.CityTitle = cityTitle
		needsUpdate = true
	}

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
		INSERT INTO users (vk_user_id, first_name, last_name, photo_200, city_id, city_title, role)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		RETURNING id
	`, user.VKUserID, user.FirstName, user.LastName, user.Photo200, user.CityID, user.CityTitle, user.Role).Scan(&user.ID); err != nil {
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
		SET first_name = ?, last_name = ?, photo_200 = ?, city_id = ?, city_title = ?, role = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, user.FirstName, user.LastName, user.Photo200, user.CityID, user.CityTitle, user.Role, user.ID)
	if err != nil {
		return err
	}
	user.UpdatedAt = time.Now()
	return nil
}

func getUserByID(id int) (*models.User, error) {
	row := database.QueryRow(`
		SELECT id, vk_user_id, first_name, last_name, photo_200, city_id, city_title, role, created_at, updated_at
		FROM users WHERE id = ?
	`, id)
	return scanUser(row)
}

func getUsersMapByIDs(ids []int) (map[int]*models.User, error) {
	if len(ids) == 0 {
		return make(map[int]*models.User), nil
	}

	idSet := make(map[int]struct{})
	var uniqueIDs []int
	for _, id := range ids {
		if _, exists := idSet[id]; !exists {
			idSet[id] = struct{}{}
			uniqueIDs = append(uniqueIDs, id)
		}
	}

	args := make([]interface{}, len(uniqueIDs))
	for i, id := range uniqueIDs {
		args[i] = id
	}

	query := fmt.Sprintf(`
		SELECT id, vk_user_id, first_name, last_name, photo_200, city_id, city_title, role, created_at, updated_at
		FROM users
		WHERE id IN (%s)
	`, buildInPlaceholders(len(uniqueIDs)))

	rows, err := database.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	usersMap := make(map[int]*models.User)
	for rows.Next() {
		user := &models.User{}
		if err := rows.Scan(
			&user.ID,
			&user.VKUserID,
			&user.FirstName,
			&user.LastName,
			&user.Photo200,
			&user.CityID,
			&user.CityTitle,
			&user.Role,
			&user.CreatedAt,
			&user.UpdatedAt,
		); err != nil {
			return nil, err
		}
		usersMap[user.ID] = user
	}

	return usersMap, nil
}

func getUserByVKUserID(vkUserID int) (*models.User, error) {
	row := database.QueryRow(`
		SELECT id, vk_user_id, first_name, last_name, photo_200, city_id, city_title, role, created_at, updated_at
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
		&user.CityID,
		&user.CityTitle,
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
		INSERT INTO groups (vk_group_id, name, screen_name, photo_200, city_id, city_title, access_token, is_active, notify_user_ids, post_types)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		RETURNING id
	`, group.VKGroupID, group.Name, group.ScreenName, group.Photo200, group.CityID, group.CityTitle, group.AccessToken, group.IsActive, group.NotifyUserIDs, group.PostTypes).Scan(&group.ID); err != nil {
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
		SET name = ?, screen_name = ?, photo_200 = ?, city_id = ?, city_title = ?, access_token = ?, is_active = ?, notify_user_ids = ?, post_types = ?, enable_post_types = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, group.Name, group.ScreenName, group.Photo200, group.CityID, group.CityTitle, group.AccessToken, group.IsActive, group.NotifyUserIDs, group.PostTypes, group.EnablePostTypes, group.ID)
	if err != nil {
		return err
	}
	group.UpdatedAt = time.Now()

	go vk.EnsureCallbackServer(group)

	return nil
}

func getGroupByID(id int) (*models.Group, error) {
	row := database.QueryRow(`
		SELECT id, vk_group_id, name, screen_name, photo_200, city_id, city_title, access_token, is_active, notify_user_ids, post_types, enable_post_types, created_at, updated_at
		FROM groups WHERE id = ?
	`, id)
	return scanGroup(row)
}

func getGroupByVKGroupID(vkGroupID int) (*models.Group, error) {
	row := database.QueryRow(`
		SELECT id, vk_group_id, name, screen_name, photo_200, city_id, city_title, access_token, is_active, notify_user_ids, post_types, enable_post_types, created_at, updated_at
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
		&group.PostTypes,
		&group.EnablePostTypes,
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

func nullableJSON(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

func createPost(post *models.Post, groupID int, status string, postTypeID string, customFields string) error {
	tx, err := database.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if err := tx.QueryRow(database.Rebind(`
		INSERT INTO posts (user_id, message, attachments, s3_video_key)
		VALUES (?, ?, ?, ?)
		RETURNING id, created_at, updated_at
	`), post.UserID, post.Message, post.Attachments, post.S3VideoKey).Scan(&post.ID, &post.CreatedAt, &post.UpdatedAt); err != nil {
		return err
	}

	pub := models.PostPublication{
		PostID:       post.ID,
		GroupID:      groupID,
		Status:       status,
		PostTypeID:   postTypeID,
		CustomFields: customFields,
	}
	if err := tx.QueryRow(database.Rebind(`
		INSERT INTO post_publications (post_id, group_id, status, post_type_id, custom_fields)
		VALUES (?, ?, ?, ?, ?)
		RETURNING id, created_at, updated_at
	`), pub.PostID, pub.GroupID, pub.Status, pub.PostTypeID, nullableJSON(pub.CustomFields)).Scan(&pub.ID, &pub.CreatedAt, &pub.UpdatedAt); err != nil {
		return err
	}

	post.Publications = []models.PostPublication{pub}

	return tx.Commit()
}

func updatePost(post *models.Post) error {
	_, err := database.Exec(`
		UPDATE posts
		SET message = ?, attachments = ?, s3_video_key = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, post.Message, post.Attachments, post.S3VideoKey, post.ID)
	if err != nil {
		return err
	}
	post.UpdatedAt = time.Now()
	return nil
}

func updatePublication(pub *models.PostPublication) error {
	_, err := database.Exec(`
		UPDATE post_publications
		SET status = ?, vk_post_id = ?, reject_reason = ?, delete_reason = ?, delete_comment = ?, publish_date = ?, post_type_id = ?, custom_fields = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, pub.Status, pub.VKPostID, pub.RejectReason, pub.DeleteReason, pub.DeleteComment, nullableTime(pub.PublishDate), pub.PostTypeID, nullableJSON(pub.CustomFields), pub.ID)
	if err != nil {
		return err
	}
	pub.UpdatedAt = time.Now()
	return nil
}

func createPublication(pub *models.PostPublication) error {
	query := `
		INSERT INTO post_publications (post_id, group_id, status, post_type_id, custom_fields)
		VALUES (?, ?, ?, ?, ?)
		RETURNING id
	`
	if err := database.QueryRow(query, pub.PostID, pub.GroupID, pub.Status, pub.PostTypeID, nullableJSON(pub.CustomFields)).Scan(&pub.ID); err != nil {
		return err
	}
	pub.CreatedAt = time.Now()
	pub.UpdatedAt = time.Now()
	return nil
}

func getPostByID(id int) (*models.Post, error) {
	row := database.QueryRow(`
		SELECT id, user_id, message, attachments, s3_video_key, created_at, updated_at
		FROM posts WHERE id = ?
	`, id)
	post, err := scanPost(row)
	if err != nil || post == nil {
		return post, err
	}
	pubs, err := getPublicationsForPost(post.ID)
	if err == nil {
		post.Publications = pubs
	}
	return post, nil
}

func getPublicationsForPost(postID int) ([]models.PostPublication, error) {
	rows, err := database.Query(`
		SELECT id, post_id, group_id, vk_post_id, status, reject_reason, delete_reason, delete_comment, publish_date, created_at, updated_at, post_type_id, custom_fields
		FROM post_publications
		WHERE post_id = ?
		ORDER BY id DESC
	`, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pubs []models.PostPublication
	for rows.Next() {
		var pub models.PostPublication
		var dbVKPostID sql.NullInt64
		var rejectReason, deleteReason, deleteComment sql.NullString
		var publishDate sql.NullTime
		var postTypeID, customFields sql.NullString

		if err := rows.Scan(
			&pub.ID,
			&pub.PostID,
			&pub.GroupID,
			&dbVKPostID,
			&pub.Status,
			&rejectReason,
			&deleteReason,
			&deleteComment,
			&publishDate,
			&pub.CreatedAt,
			&pub.UpdatedAt,
			&postTypeID,
			&customFields,
		); err != nil {
			return nil, err
		}

		if dbVKPostID.Valid {
			pub.VKPostID = int(dbVKPostID.Int64)
		}
		if rejectReason.Valid {
			pub.RejectReason = rejectReason.String
		}
		if deleteReason.Valid {
			pub.DeleteReason = deleteReason.String
		}
		if deleteComment.Valid {
			pub.DeleteComment = deleteComment.String
		}
		if publishDate.Valid {
			pub.PublishDate = publishDate.Time
		}
		if postTypeID.Valid {
			pub.PostTypeID = postTypeID.String
		}
		if customFields.Valid {
			pub.CustomFields = customFields.String
		}

		pubs = append(pubs, pub)
	}
	return pubs, nil
}

func buildInPlaceholders(n int) string {
	if n == 0 {
		return ""
	}
	placeholders := make([]string, n)
	for i := range placeholders {
		placeholders[i] = "?"
	}
	return strings.Join(placeholders, ", ")
}

func populatePublicationsForPosts(posts []*models.Post) error {
	if len(posts) == 0 {
		return nil
	}

	args := make([]interface{}, len(posts))
	for i, post := range posts {
		args[i] = post.ID
	}

	query := fmt.Sprintf(`
		SELECT id, post_id, group_id, vk_post_id, status, reject_reason, delete_reason, delete_comment, publish_date, created_at, updated_at, post_type_id, custom_fields
		FROM post_publications
		WHERE post_id IN (%s)
		ORDER BY id DESC
	`, buildInPlaceholders(len(posts)))

	rows, err := database.Query(query, args...)
	if err != nil {
		return err
	}
	defer rows.Close()

	pubsMap := make(map[int][]models.PostPublication)
	for rows.Next() {
		var pub models.PostPublication
		var dbVKPostID sql.NullInt64
		var rejectReason, deleteReason, deleteComment sql.NullString
		var publishDate sql.NullTime
		var postTypeID, customFields sql.NullString

		if err := rows.Scan(
			&pub.ID,
			&pub.PostID,
			&pub.GroupID,
			&dbVKPostID,
			&pub.Status,
			&rejectReason,
			&deleteReason,
			&deleteComment,
			&publishDate,
			&pub.CreatedAt,
			&pub.UpdatedAt,
			&postTypeID,
			&customFields,
		); err != nil {
			return err
		}

		if dbVKPostID.Valid {
			pub.VKPostID = int(dbVKPostID.Int64)
		}
		if rejectReason.Valid {
			pub.RejectReason = rejectReason.String
		}
		if deleteReason.Valid {
			pub.DeleteReason = deleteReason.String
		}
		if deleteComment.Valid {
			pub.DeleteComment = deleteComment.String
		}
		if publishDate.Valid {
			pub.PublishDate = publishDate.Time
		}
		if postTypeID.Valid {
			pub.PostTypeID = postTypeID.String
		}
		if customFields.Valid {
			pub.CustomFields = customFields.String
		}
		if deleteComment.Valid {
			pub.DeleteComment = deleteComment.String
		}
		if publishDate.Valid {
			pub.PublishDate = publishDate.Time
		}

		pubsMap[pub.PostID] = append(pubsMap[pub.PostID], pub)
	}

	for _, post := range posts {
		if pubs, ok := pubsMap[post.ID]; ok {
			post.Publications = pubs
		} else {
			post.Publications = []models.PostPublication{}
		}
	}

	return nil
}

func getPostsByStatusAndGroup(status string, groupID int, limit, offset int) ([]*models.Post, error) {
	rows, err := database.Query(`
		SELECT p.id, p.user_id, p.message, p.attachments, p.s3_video_key, p.created_at, p.updated_at
		FROM posts p
		INNER JOIN post_publications pub ON p.id = pub.post_id
		WHERE pub.status = ? AND pub.group_id = ?
		ORDER BY p.created_at DESC
		LIMIT ? OFFSET ?
	`, status, groupID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	posts, err := scanPostRows(rows)
	if err != nil {
		return nil, err
	}
	if err := populatePublicationsForPosts(posts); err != nil {
		return nil, err
	}
	return posts, nil
}

func getPostsByUserID(userID int, limit, offset int) ([]*models.Post, error) {
	rows, err := database.Query(`
		SELECT id, user_id, message, attachments, s3_video_key, created_at, updated_at
		FROM posts
		WHERE user_id = ? AND COALESCE(status, '') != 'deleted'
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	posts, err := scanPostRows(rows)
	if err != nil {
		return nil, err
	}
	if err := populatePublicationsForPosts(posts); err != nil {
		return nil, err
	}
	return posts, nil
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
		s3VideoKey  sql.NullString
		attachments sql.NullString
	)

	err := row.Scan(
		&post.ID,
		&dbUserID,
		&post.Message,
		&attachments,
		&s3VideoKey,
		&post.CreatedAt,
		&post.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if dbUserID.Valid {
		post.UserID = int(dbUserID.Int64)
	}
	if s3VideoKey.Valid {
		post.S3VideoKey = s3VideoKey.String
	}
	if attachments.Valid {
		post.Attachments = attachments.String
	}
	return &post, nil
}

func scanPostFromRows(rows *sql.Rows) (*models.Post, error) {
	var (
		post        models.Post
		dbUserID    sql.NullInt64
		s3VideoKey  sql.NullString
		attachments sql.NullString
	)

	if err := rows.Scan(
		&post.ID,
		&dbUserID,
		&post.Message,
		&attachments,
		&s3VideoKey,
		&post.CreatedAt,
		&post.UpdatedAt,
	); err != nil {
		return nil, err
	}

	if dbUserID.Valid {
		post.UserID = int(dbUserID.Int64)
	}
	if s3VideoKey.Valid {
		post.S3VideoKey = s3VideoKey.String
	}
	if attachments.Valid {
		post.Attachments = attachments.String
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

type notificationDeliveryReport struct {
	AdminsConfigured int
	AdminsNotified   int
	AdminFailures    []string
	UserNotified     bool
	UserChannel      string
	UserFailure      string
}

func loadNotifyUserIDs(groupID int) ([]int, error) {
	var notifyUserIDsStr string
	err := database.QueryRow("SELECT notify_user_ids FROM groups WHERE id = ?", groupID).Scan(&notifyUserIDsStr)
	if err != nil || notifyUserIDsStr == "" || notifyUserIDsStr == "[]" {
		return nil, err
	}

	var notifyUserIDs []int
	if err := json.Unmarshal([]byte(notifyUserIDsStr), &notifyUserIDs); err != nil {
		return nil, err
	}
	return notifyUserIDs, nil
}

func sendDirectOrBellNotification(client *vk.VKClient, serviceClient *vk.VKClient, vkUserID int, message string) (string, error) {
	var dmErr error
	if client != nil {
		if err := client.SendDirectMessage(vkUserID, message); err == nil {
			return "dm", nil
		} else {
			dmErr = err
		}
	} else {
		dmErr = fmt.Errorf("official_group_token_missing")
	}

	if serviceClient == nil {
		return "", fmt.Errorf("dm: %w; bell: service_key_missing", dmErr)
	}
	if notifErr := serviceClient.SendNotification(strconv.Itoa(vkUserID), message); notifErr == nil {
		return "bell", nil
	} else {
		return "", fmt.Errorf("dm: %v; bell: %v", dmErr, notifErr)
	}
}

func formatNotificationFailures(failures []string) string {
	if len(failures) == 0 {
		return "none"
	}
	const maxFailuresInLog = 5
	if len(failures) > maxFailuresInLog {
		return strings.Join(failures[:maxFailuresInLog], "; ") + fmt.Sprintf("; ... and %d more", len(failures)-maxFailuresInLog)
	}
	return strings.Join(failures, "; ")
}

func sendPostCreatedNotifications(groupID int, postID int, userID int, vkUserID int, userMessage string, adminMessage string) {
	go func() {
		report := notificationDeliveryReport{}
		cfg := config.Load()

		notifyUserIDs, err := loadNotifyUserIDs(groupID)
		if err != nil && err != sql.ErrNoRows {
			report.AdminFailures = append(report.AdminFailures, fmt.Sprintf("load_admins: %v", err))
		}
		report.AdminsConfigured = len(notifyUserIDs)

		var client *vk.VKClient
		if cfg.VKOfficialGroupToken != "" {
			client = vk.NewVKClient(cfg.VKOfficialGroupToken)
		}
		var serviceClient *vk.VKClient
		if cfg.VKServiceKey != "" {
			serviceClient = vk.NewVKClient(cfg.VKServiceKey)
		}

		for _, adminVKUserID := range notifyUserIDs {
			channel, err := sendDirectOrBellNotification(client, serviceClient, adminVKUserID, adminMessage)
			if err != nil {
				report.AdminFailures = append(report.AdminFailures, fmt.Sprintf("admin %d: %v", adminVKUserID, err))
				log.Printf("[VK Notifications] Failed to notify admin %d for post %d: %v", adminVKUserID, postID, err)
				continue
			}
			report.AdminsNotified++
			log.Printf("[VK Notifications] Successfully notified admin %d via %s for post %d", adminVKUserID, channel, postID)
		}

		channel, err := sendDirectOrBellNotification(client, serviceClient, vkUserID, userMessage)
		if err != nil {
			report.UserFailure = err.Error()
			log.Printf("[VK Notifications] Failed to notify user %d for post %d: %v", vkUserID, postID, err)
		} else {
			report.UserNotified = true
			report.UserChannel = channel
			log.Printf("[VK Notifications] Successfully notified user %d via %s for post %d", vkUserID, channel, postID)
		}

		details := fmt.Sprintf(
			"Group ID: %d, Post ID: %d, User VK ID: %d, Admins configured: %d, Admins notified: %d, Admin notification failures: %d, User notified: %t, User channel: %s, User failure: %s, Failures: %s",
			groupID,
			postID,
			vkUserID,
			report.AdminsConfigured,
			report.AdminsNotified,
			len(report.AdminFailures),
			report.UserNotified,
			report.UserChannel,
			report.UserFailure,
			formatNotificationFailures(report.AdminFailures),
		)
		if report.AdminsConfigured == 0 || report.AdminsNotified < report.AdminsConfigured || !report.UserNotified {
			models.LogWarning("POST_CREATED_NOTIFICATIONS", "Не все уведомления по новой записи доставлены", &userID, details)
			return
		}
		models.LogInfo("POST_CREATED_NOTIFICATIONS", "Уведомления по новой записи успешно отправлены", &userID, details)
	}()
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
			if err := client.SendDirectMessage(vkUserID, message); err != nil {
				log.Printf("[VK Notifications] Failed to send to admin %d: %v", vkUserID, err)
			} else {
				log.Printf("[VK Notifications] Successfully sent to admin %d", vkUserID)
			}
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
		if err := client.SendDirectMessage(vkUserID, message); err != nil {
			log.Printf("[VK Notifications] Failed to send DM to user %d: %v. Attempting bell notification...", vkUserID, err)
			serviceKey := os.Getenv("VK_SERVICE_KEY")
			if serviceKey != "" {
				serviceClient := vk.NewVKClient(serviceKey)
				if notifErr := serviceClient.SendNotification(strconv.Itoa(vkUserID), message); notifErr != nil {
					log.Printf("[VK Notifications] Failed to send bell notification to user %d: %v", vkUserID, notifErr)
				} else {
					log.Printf("[VK Notifications] Successfully sent bell notification to user %d", vkUserID)
				}
			}
		} else {
			log.Printf("[VK Notifications] Successfully sent DM to user %d", vkUserID)
		}
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
		// If access is denied (VK error 15) or token lacks permissions, simply return an empty list of managers
		// rather than returning a 500 server error to avoid crashing the UI or cluttering the logs.
		utils.RespondSuccess(w, []managerResponse{})
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
	var s3VideoKey, attachments sql.NullString
	err = database.DB.QueryRow("SELECT s3_video_key, attachments FROM posts WHERE id = $1 AND user_id = $2", postID, user.ID).Scan(&s3VideoKey, &attachments)
	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("[deletePostHandler] Post %d not found or user %d is not the author", postID, user.ID)
			utils.RespondError(w, http.StatusNotFound, "post not found or you are not the author")
			return
		}
		log.Printf("[deletePostHandler] Database error: %v", err)
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Удаляем медиа из S3
	if s3VideoKey.Valid && s3VideoKey.String != "" {
		s3Client, err := s3client.New()
		if err == nil {
			s3Keys := strings.Split(s3VideoKey.String, ",")
			for _, key := range s3Keys {
				key = strings.TrimSpace(key)
				if key != "" {
					s3Client.DeleteObject(r.Context(), key)
				}
			}
		}
	}

	// Начинаем транзакцию для атомарного удаления
	tx, err := database.DB.Begin()
	if err != nil {
		log.Printf("[deletePostHandler] Failed to begin transaction: %v", err)
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback()

	// Soft-delete: обновляем статус и очищаем медиа в posts
	res, err := tx.Exec(
		"UPDATE posts SET status = 'deleted', delete_reason = $1, delete_comment = $2, s3_video_key = '', attachments = '' WHERE id = $3 AND user_id = $4",
		reqBody.Reason, reqBody.Comment, postID, user.ID,
	)
	if err != nil {
		log.Printf("[deletePostHandler] Failed to update posts table: %v", err)
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		log.Printf("[deletePostHandler] No rows affected in posts table")
		utils.RespondError(w, http.StatusNotFound, "post not found or you are not the author")
		return
	}

	// Soft-delete в post_publications
	_, err = tx.Exec(
		"UPDATE post_publications SET status = 'deleted', delete_reason = $1, delete_comment = $2 WHERE post_id = $3",
		reqBody.Reason, reqBody.Comment, postID,
	)
	if err != nil {
		log.Printf("[deletePostHandler] Failed to update post_publications table: %v", err)
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if err := tx.Commit(); err != nil {
		log.Printf("[deletePostHandler] Failed to commit transaction: %v", err)
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	log.Printf("[deletePostHandler] Successfully deleted post %d by user %d", postID, user.ID)

	models.LogInfo("POST_DELETED", "Пользователь удалил свой пост", &user.ID, fmt.Sprintf("Post ID: %d, Reason: %s", postID, reqBody.Reason))

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

	// Генерируем уникальный ключ для файла (используем только безопасные символы)
	fileName := r.URL.Query().Get("filename")
	contentType := r.URL.Query().Get("type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	safeSuffix := safeMediaSuffix(fileName, contentType)
	key := fmt.Sprintf("pending-media/%d_%s", time.Now().UnixNano(), safeSuffix)

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

// POST /api/app/notifications/test
func testNotificationHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.RespondError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	ctx, err := parseLaunchContext(r)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	cfg := config.Load()
	if cfg.VKOfficialGroupToken == "" {
		utils.RespondError(w, http.StatusInternalServerError, "Official group token not configured")
		return
	}
	client := vk.NewVKClient(cfg.VKOfficialGroupToken)

	message := "Привет! Это тестовое сообщение от ЗооПлатформы. Уведомления работают отлично! 🎉"
	if err := client.SendDirectMessage(ctx.UserID, message); err != nil {
		log.Printf("[Test Notification] Failed to send to %d: %v", ctx.UserID, err)
		utils.RespondError(w, http.StatusBadRequest, fmt.Sprintf("Ошибка ВК: %v", err))
		return
	}

	log.Printf("[Test Notification] Successfully sent to %d", ctx.UserID)
	utils.RespondSuccess(w, map[string]string{"status": "ok"})
}

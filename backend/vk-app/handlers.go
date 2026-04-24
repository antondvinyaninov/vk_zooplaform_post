package vkapp

import (
	"backend/config"
	"backend/database"
	"backend/models"
	"backend/utils"
	"backend/vk"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
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
	PublishDate *string       `json:"publish_date,omitempty"`
	CreatedAt   string        `json:"created_at"`
	UpdatedAt   string        `json:"updated_at"`
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
	IsActive      bool   `json:"is_active"`
	HasToken      bool   `json:"has_token"`
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

	var req struct {
		Message string `json:"message"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	req.Message = strings.TrimSpace(req.Message)
	if len(req.Message) < 10 {
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

	post := &models.Post{
		UserID:  user.ID,
		GroupID: group.ID,
		Message: req.Message,
		Status:  "pending",
	}
	if err := createPost(post); err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	sendNotificationToUser(ctx.UserID, "Ваш пост отправлен на модерацию. Мы сообщим, когда он будет опубликован.")
	sendNotificationToAdmins(group.ID, fmt.Sprintf("Пользователь предложил новый пост в группу \"%s\". Проверьте панель модерации!", group.Name))

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
		if r.Method != http.MethodGet {
			utils.RespondError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		getPostByIDHandler(w, postID)
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

	utils.RespondSuccess(w, response)
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
		Status      string `json:"status"`
		PublishDate string `json:"publish_date"`
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

	switch req.Status {
	case "published":
		group, err := getGroupByID(post.GroupID)
		if err != nil {
			utils.RespondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if group == nil {
			utils.RespondError(w, http.StatusBadRequest, "group not found")
			return
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

		client := vk.NewVKClient(token)
		// from_group=true: постим от имени группы (требует токена сообщества или токена админа с правами)
		vkPostID, err := client.WallPost("-"+strconv.Itoa(group.VKGroupID), post.Message, nil, true, 0)
		if err != nil {
			log.Printf("[Moderate] VK wall.post error for group %d: %v", group.VKGroupID, err)
			utils.RespondError(w, http.StatusBadRequest, err.Error())
			return
		}
		post.VKPostID = vkPostID
		post.Status = "published"
		post.PublishDate = time.Time{}
	case "scheduled":
		if strings.TrimSpace(req.PublishDate) == "" {
			utils.RespondError(w, http.StatusBadRequest, "publish_date is required for scheduled status")
			return
		}
		publishDate, err := time.Parse(time.RFC3339, req.PublishDate)
		if err != nil {
			utils.RespondError(w, http.StatusBadRequest, "publish_date must be RFC3339")
			return
		}
		post.Status = "scheduled"
		post.PublishDate = publishDate
	case "rejected":
		post.Status = "rejected"
		post.PublishDate = time.Time{}
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
			sendNotificationToUser(author.VKUserID, "Ваш предложенный пост был успешно опубликован!")
		case "scheduled":
			sendNotificationToUser(author.VKUserID, fmt.Sprintf("Ваш предложенный пост поставлен в очередь на публикацию: %s", post.PublishDate.Format("02.01.2006 15:04")))
		case "rejected":
			sendNotificationToUser(author.VKUserID, "К сожалению, ваш предложенный пост был отклонен модератором.")
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
			ScreenName    *string `json:"screen_name"`
			Photo200      *string `json:"photo_200"`
			IsActive      *bool   `json:"is_active"`
			NotifyUserIDs []int   `json:"notify_user_ids"`
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
		Message:   post.Message,
		Status:    post.Status,
		VKPostID:  post.VKPostID,
		CreatedAt: post.CreatedAt.Format(time.RFC3339),
		UpdatedAt: post.UpdatedAt.Format(time.RFC3339),
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
		INSERT INTO groups (vk_group_id, name, screen_name, photo_200, access_token, is_active, notify_user_ids)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		RETURNING id
	`, group.VKGroupID, group.Name, group.ScreenName, group.Photo200, group.AccessToken, group.IsActive, group.NotifyUserIDs).Scan(&group.ID); err != nil {
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
		SET name = ?, screen_name = ?, photo_200 = ?, access_token = ?, is_active = ?, notify_user_ids = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, group.Name, group.ScreenName, group.Photo200, group.AccessToken, group.IsActive, group.NotifyUserIDs, group.ID)
	if err != nil {
		return err
	}
	group.UpdatedAt = time.Now()

	go vk.EnsureCallbackServer(group)

	return nil
}

func getGroupByID(id int) (*models.Group, error) {
	row := database.QueryRow(`
		SELECT id, vk_group_id, name, screen_name, photo_200, access_token, is_active, notify_user_ids, created_at, updated_at
		FROM groups WHERE id = ?
	`, id)
	return scanGroup(row)
}

func getGroupByVKGroupID(vkGroupID int) (*models.Group, error) {
	row := database.QueryRow(`
		SELECT id, vk_group_id, name, screen_name, photo_200, access_token, is_active, notify_user_ids, created_at, updated_at
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
		INSERT INTO posts (vk_post_id, user_id, group_id, message, attachments, status, publish_date)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		RETURNING id
	`, post.VKPostID, post.UserID, post.GroupID, post.Message, post.Attachments, post.Status, nullableTime(post.PublishDate)).Scan(&post.ID); err != nil {
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
		SET vk_post_id = ?, user_id = ?, group_id = ?, message = ?, attachments = ?, status = ?, publish_date = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, post.VKPostID, post.UserID, post.GroupID, post.Message, post.Attachments, post.Status, nullableTime(post.PublishDate), post.ID)
	if err != nil {
		return err
	}
	post.UpdatedAt = time.Now()
	return nil
}

func getPostByID(id int) (*models.Post, error) {
	row := database.QueryRow(`
		SELECT id, vk_post_id, user_id, group_id, message, attachments, status, publish_date, created_at, updated_at
		FROM posts WHERE id = ?
	`, id)
	return scanPost(row)
}

func getPostsByStatus(status string, limit, offset int) ([]*models.Post, error) {
	rows, err := database.Query(`
		SELECT id, vk_post_id, user_id, group_id, message, attachments, status, publish_date, created_at, updated_at
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
		SELECT id, vk_post_id, user_id, group_id, message, attachments, status, publish_date, created_at, updated_at
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

	err := row.Scan(
		&post.ID,
		&dbVKPostID,
		&dbUserID,
		&post.GroupID,
		&post.Message,
		&post.Attachments,
		&post.Status,
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

	if err := rows.Scan(
		&post.ID,
		&dbVKPostID,
		&dbUserID,
		&post.GroupID,
		&post.Message,
		&post.Attachments,
		&post.Status,
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
		Response struct {
			Items []struct {
				ID        int    `json:"id"`
				FirstName string `json:"first_name"`
				LastName  string `json:"last_name"`
				Role      string `json:"role"`
			} `json:"items"`
		} `json:"response"`
	}

	if err := json.Unmarshal(resp, &vkResp); err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	managers := []managerResponse{}
	for _, item := range vkResp.Response.Items {
		managers = append(managers, managerResponse{
			ID:        item.ID,
			FirstName: item.FirstName,
			LastName:  item.LastName,
			Role:      item.Role,
		})
	}

	utils.RespondSuccess(w, managers)
}

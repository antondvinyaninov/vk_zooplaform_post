package admin

import (
	"backend/config"
	"backend/vk"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
)

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "ok",
		"service": "admin",
	})
}

// vkPostHandler — публикация нового поста на стене группы.
// Принимает multipart/form-data (с фото) или JSON.
func vkPostHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}

	// Парсим тело — поддерживаем и FormData, и JSON
	var (
		accessToken string
		ownerID     string
		message     string
		fromGroup   int
		publishDate int64
	)

	ct := r.Header.Get("Content-Type")
	if strings.HasPrefix(ct, "multipart/form-data") || strings.HasPrefix(ct, "application/x-www-form-urlencoded") {
		if err := r.ParseMultipartForm(32 << 20); err != nil {
			r.ParseForm()
		}
		accessToken = r.FormValue("access_token")
		ownerID = r.FormValue("owner_id")
		message = r.FormValue("message")
		if v := r.FormValue("from_group"); v == "1" {
			fromGroup = 1
		}
		if v := r.FormValue("publish_date"); v != "" {
			fmt.Sscanf(v, "%d", &publishDate)
		}
	} else {
		var req struct {
			AccessToken string `json:"access_token"`
			OwnerID     string `json:"owner_id"`
			Message     string `json:"message"`
			FromGroup   int    `json:"from_group"`
			PublishDate int64  `json:"publish_date"`
			Attachments string `json:"attachments"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid JSON"})
			return
		}
		accessToken = req.AccessToken
		ownerID = req.OwnerID
		message = req.Message
		fromGroup = req.FromGroup
		publishDate = req.PublishDate
	}

	token := resolveToken(accessToken)
	if token == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "VK account not connected — please login at /vk-connect"})
		return
	}

	client := vk.NewVKClient(token)

	// Загружаем фотографии если есть
	var attachments []string
	if r.MultipartForm != nil {
		files := r.MultipartForm.File["photos"]
		groupIDStr := strings.TrimPrefix(ownerID, "-")
		for _, fh := range files {
			f, err := fh.Open()
			if err != nil {
				continue
			}
			// Сохраняем во временный файл
			tmpPath := "/tmp/upload_" + fh.Filename
			if out, err := os.Create(tmpPath); err == nil {
				io.Copy(out, f)
				out.Close()
				if att, err := client.UploadPhotoToWall(tmpPath, groupIDStr); err == nil {
					attachments = append(attachments, att)
				} else {
					log.Printf("[vkPost] photo upload error: %v", err)
				}
				os.Remove(tmpPath)
			}
			f.Close()
		}
	}

	postID, err := client.WallPost(ownerID, message, attachments, fromGroup == 1, publishDate)
	if err != nil {
		log.Printf("[vkPost] VK wall.post error: %v", err)
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	respondJSON(w, http.StatusOK, map[string]interface{}{"post_id": postID})
}

// vkGetPostsHandler — получение постов со стены (wall.get)
func vkGetPostsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}
	var req struct {
		AccessToken string `json:"access_token"`
		OwnerID     string `json:"owner_id"`
		Count       int    `json:"count"`
		Offset      int    `json:"offset"`
		Filter      string `json:"filter"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid JSON"})
		return
	}
	token := resolveToken(req.AccessToken)
	if token == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "VK account not connected"})
		return
	}
	if req.Count <= 0 {
		req.Count = 10
	}
	client := vk.NewVKClient(token)
	result, err := client.WallGet(req.OwnerID, req.Count, req.Offset, req.Filter)
	if err != nil {
		log.Printf("[vkGetPosts] error: %v", err)
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	respondJSON(w, http.StatusOK, result)
}

// vkRepostHandler — репост записи в группу (wall.repost)
func vkRepostHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}
	var req struct {
		AccessToken string `json:"access_token"`
		Object      string `json:"object"`
		GroupID     string `json:"group_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid JSON"})
		return
	}
	token := resolveToken(req.AccessToken)
	if token == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "VK account not connected"})
		return
	}
	client := vk.NewVKClient(token)
	result, err := client.WallRepost(req.Object, req.GroupID)
	if err != nil {
		log.Printf("[vkRepost] error: %v", err)
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"post_id":      result.PostID,
		"reposts_count": result.RepostsCount,
		"likes_count":   result.LikesCount,
	})
}

// vkCopyPostHandler — копирование поста (wall.post с текстом и вложениями)
func vkCopyPostHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}
	var req struct {
		AccessToken string `json:"access_token"`
		OwnerID     string `json:"owner_id"`
		Message     string `json:"message"`
		Attachments string `json:"attachments"`
		FromGroup   int    `json:"from_group"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid JSON"})
		return
	}
	token := resolveToken(req.AccessToken)
	if token == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "VK account not connected"})
		return
	}
	client := vk.NewVKClient(token)
	var attachments []string
	if req.Attachments != "" {
		attachments = strings.Split(req.Attachments, ",")
	}
	postID, err := client.WallPost(req.OwnerID, req.Message, attachments, req.FromGroup == 1, 0)
	if err != nil {
		log.Printf("[vkCopyPost] error: %v", err)
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	respondJSON(w, http.StatusOK, map[string]interface{}{"post_id": postID})
}

// resolveToken возвращает токен из запроса или активный из vk_accounts
func resolveToken(fromRequest string) string {
	if t := strings.TrimSpace(fromRequest); t != "" {
		return t
	}
	// fallback: активный аккаунт из БД
	token, err := getActiveAccountToken()
	if err != nil {
		log.Printf("[resolveToken] db error: %v", err)
	}
	return token
}

func vkGetGroupsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		AccessToken string `json:"access_token"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid JSON"})
		return
	}

	if req.AccessToken == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Access token required"})
		return
	}

	// Создаем VK клиент
	vkClient := vk.NewVKClient(req.AccessToken)

	// Получаем группы пользователя с расширенной информацией
	groups, err := vkClient.GroupsGet(true, "")
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	// Добавляем отладочную информацию
	response := map[string]interface{}{
		"count": groups.Count,
		"items": groups.Items,
		"debug": map[string]interface{}{
			"total_groups": len(groups.Items),
			"has_token":    req.AccessToken != "",
		},
	}

	respondJSON(w, http.StatusOK, response)
}

func vkUserInfoHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("🔍 [VK User Info] Request: %s %s from %s", r.Method, r.URL.Path, r.RemoteAddr)

	if r.Method != http.MethodPost {
		respondJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}

	var req struct {
		AccessToken string `json:"access_token"`
		UserID      int    `json:"user_id"`
		UserIDRaw   string `json:"user_id_raw"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid JSON"})
		return
	}

	if req.UserID == 0 && strings.TrimSpace(req.UserIDRaw) != "" {
		if parsed, err := strconv.Atoi(strings.TrimSpace(req.UserIDRaw)); err == nil {
			req.UserID = parsed
		}
	}

	cfg := config.Load()

	var (
		user *vk.User
		err  error
	)

	if req.UserID != 0 {
		// Используем Service Key — нет привязки к IP
		serviceClient := vk.NewVKClient(cfg.VKServiceKey)
		user, err = serviceClient.GetUserByID(req.UserID, []string{"photo_200"})
	} else if strings.TrimSpace(req.AccessToken) != "" {
		// Fallback: если user_id не знаем — пробуем через сервисный ключ
		serviceClient := vk.NewVKClient(cfg.VKServiceKey)
		users, fetchErr := serviceClient.UsersGet(nil, []string{"photo_200"})
		if fetchErr != nil {
			err = fetchErr
		} else if len(users) > 0 {
			user = &users[0]
		}
	} else {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "user_id or access_token required"})
		return
	}

	if err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	if user == nil {
		respondJSON(w, http.StatusNotFound, map[string]string{"error": "User not found"})
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"user": user,
	})
}

func vkServiceKeyHandler(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func vkOAuthCallbackHandler(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	if code == "" {
		http.Redirect(w, r, "/vk-connect?error=no_code", http.StatusTemporaryRedirect)
		return
	}

	cfg := config.Load()
	redirectURI := "https://vk.zooplatforma.ru/api/vk/oauth/callback"
	
	tokenURL := fmt.Sprintf("https://oauth.vk.com/access_token?client_id=%s&client_secret=%s&redirect_uri=%s&code=%s",
		cfg.VKClientID, cfg.VKClientSecret, redirectURI, code)

	resp, err := http.Get(tokenURL)
	if err != nil {
		log.Printf("[VK OAuth] Failed to exchange code: %v", err)
		http.Redirect(w, r, "/vk-connect?error=exchange_failed", http.StatusTemporaryRedirect)
		return
	}
	defer resp.Body.Close()

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
		UserID      int    `json:"user_id"`
		Error       string `json:"error"`
		ErrorDesc   string `json:"error_description"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		log.Printf("[VK OAuth] Failed to decode token response: %v", err)
		http.Redirect(w, r, "/vk-connect?error=decode_failed", http.StatusTemporaryRedirect)
		return
	}

	if tokenResp.Error != "" {
		log.Printf("[VK OAuth] VK Error: %s - %s", tokenResp.Error, tokenResp.ErrorDesc)
		http.Redirect(w, r, "/vk-connect?error=vk_api_error", http.StatusTemporaryRedirect)
		return
	}

	// Успешный обмен. Редиректим обратно на фронтенд vk-connect.
	// Фронтенд подхватит эти данные через checkTokenInURL.
	finalRedirect := fmt.Sprintf("/vk-connect#access_token=%s&user_id=%d&expires_in=%d",
		tokenResp.AccessToken, tokenResp.UserID, tokenResp.ExpiresIn)
	
	http.Redirect(w, r, finalRedirect, http.StatusTemporaryRedirect)
}

func vkOAuthTokenHandler(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

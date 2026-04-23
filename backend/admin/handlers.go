package admin

import (
	"backend/vk"
	"encoding/json"
	"log"
	"net/http"
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

// TODO: Перенести все handler'ы из main.go сюда
func vkPostHandler(w http.ResponseWriter, r *http.Request) {
	// Временная заглушка
	respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func vkGetPostsHandler(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func vkRepostHandler(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func vkCopyPostHandler(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
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
		log.Printf("❌ [VK User Info] Method not allowed: %s", r.Method)
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

	req.AccessToken = strings.TrimSpace(req.AccessToken)
	if req.AccessToken == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Access token required"})
		return
	}

	if req.UserID == 0 && strings.TrimSpace(req.UserIDRaw) != "" {
		if parsed, err := strconv.Atoi(strings.TrimSpace(req.UserIDRaw)); err == nil {
			req.UserID = parsed
		}
	}

	vkClient := vk.NewVKClient(req.AccessToken)
	var (
		user *vk.User
		err  error
	)

	if req.UserID != 0 {
		user, err = vkClient.GetUserByID(req.UserID, []string{"photo_200"})
	} else {
		users, fetchErr := vkClient.UsersGet(nil, []string{"photo_200"})
		if fetchErr != nil {
			err = fetchErr
		} else if len(users) > 0 {
			user = &users[0]
		}
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
	respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func vkOAuthTokenHandler(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

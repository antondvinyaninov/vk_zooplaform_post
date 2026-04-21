package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
)

type Response struct {
	Message string `json:"message"`
	Status  string `json:"status"`
}

type VKPostRequest struct {
	OwnerID     string `json:"owner_id"`
	Message     string `json:"message"`
	AccessToken string `json:"access_token"`
	FromGroup   int    `json:"from_group"`
}

type VKPostResponse struct {
	PostID int    `json:"post_id,omitempty"`
	Error  string `json:"error,omitempty"`
}

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(Response{
		Message: "Server is running",
		Status:  "ok",
	})
}

func main() {
	http.HandleFunc("/health", corsMiddleware(healthHandler))
	http.HandleFunc("/vk/post", corsMiddleware(vkPostHandler))
	http.HandleFunc("/vk/groups", corsMiddleware(vkGetGroupsHandler))

	log.Println("Server starting on :8000")
	if err := http.ListenAndServe(":8000", nil); err != nil {
		log.Fatal(err)
	}
}

func vkPostHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req VKPostRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(VKPostResponse{Error: "Invalid request body"})
		return
	}

	// Валидация
	if req.OwnerID == "" || req.Message == "" || req.AccessToken == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(VKPostResponse{Error: "owner_id, message and access_token are required"})
		return
	}

	// Отправка поста в VK
	vkURL := "https://api.vk.com/method/wall.post"
	params := url.Values{}
	params.Set("owner_id", req.OwnerID)
	params.Set("message", req.Message)
	params.Set("from_group", fmt.Sprintf("%d", req.FromGroup))
	params.Set("access_token", req.AccessToken)
	params.Set("v", "5.131")

	resp, err := http.PostForm(vkURL, params)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(VKPostResponse{Error: fmt.Sprintf("VK API error: %v", err)})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(VKPostResponse{Error: "Failed to read VK response"})
		return
	}

	// Парсим ответ VK
	var vkResp struct {
		Response struct {
			PostID int `json:"post_id"`
		} `json:"response"`
		Error struct {
			ErrorCode int    `json:"error_code"`
			ErrorMsg  string `json:"error_msg"`
		} `json:"error"`
	}

	if err := json.Unmarshal(body, &vkResp); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(VKPostResponse{Error: "Failed to parse VK response"})
		return
	}

	// Проверяем на ошибки VK
	if vkResp.Error.ErrorCode != 0 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(VKPostResponse{
			Error: fmt.Sprintf("VK Error %d: %s", vkResp.Error.ErrorCode, vkResp.Error.ErrorMsg),
		})
		return
	}

	// Успешный ответ
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(VKPostResponse{PostID: vkResp.Response.PostID})
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
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body"})
		return
	}

	if req.AccessToken == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "access_token is required"})
		return
	}

	// Получаем группы пользователя
	vkURL := "https://api.vk.com/method/groups.get"
	params := url.Values{}
	params.Set("access_token", req.AccessToken)
	params.Set("extended", "1")
	params.Set("filter", "admin,editor,moder")
	params.Set("v", "5.131")

	resp, err := http.PostForm(vkURL, params)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": fmt.Sprintf("VK API error: %v", err)})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to read VK response"})
		return
	}

	// Парсим ответ VK
	var vkResp struct {
		Response struct {
			Count int `json:"count"`
			Items []struct {
				ID           int    `json:"id"`
				Name         string `json:"name"`
				ScreenName   string `json:"screen_name"`
				Photo200     string `json:"photo_200"`
				MembersCount int    `json:"members_count"`
			} `json:"items"`
		} `json:"response"`
		Error struct {
			ErrorCode int    `json:"error_code"`
			ErrorMsg  string `json:"error_msg"`
		} `json:"error"`
	}

	if err := json.Unmarshal(body, &vkResp); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to parse VK response"})
		return
	}

	// Проверяем на ошибки VK
	if vkResp.Error.ErrorCode != 0 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": fmt.Sprintf("VK Error %d: %s", vkResp.Error.ErrorCode, vkResp.Error.ErrorMsg),
		})
		return
	}

	// Успешный ответ
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(vkResp.Response)
}

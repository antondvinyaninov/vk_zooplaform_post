package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
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
	// API endpoints (регистрируем ПЕРВЫМИ)
	http.HandleFunc("/api/health", corsMiddleware(healthHandler))
	http.HandleFunc("/api/vk/post", corsMiddleware(vkPostHandler))
	http.HandleFunc("/api/vk/posts", corsMiddleware(vkGetPostsHandler))
	http.HandleFunc("/api/vk/groups", corsMiddleware(vkGetGroupsHandler))
	http.HandleFunc("/api/vk/exchange-code", corsMiddleware(vkExchangeCodeHandler))
	http.HandleFunc("/api/vk/refresh-token", corsMiddleware(vkRefreshTokenHandler))
	http.HandleFunc("/api/vk/user-info", corsMiddleware(vkUserInfoHandler))
	http.HandleFunc("/api/vk/service-key", corsMiddleware(vkServiceKeyHandler))

	// Раздача статических файлов фронтенда (регистрируем ПОСЛЕДНИМ)
	fs := http.FileServer(http.Dir("./frontend"))
	http.Handle("/", fs)

	port := os.Getenv("PORT")
	if port == "" {
		port = "80"
	}

	log.Printf("Server starting on :%s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}

func vkPostHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Парсим multipart form для поддержки файлов
	err := r.ParseMultipartForm(32 << 20) // 32 MB max
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(VKPostResponse{Error: "Failed to parse form data"})
		return
	}

	ownerId := r.FormValue("owner_id")
	message := r.FormValue("message")
	accessToken := r.FormValue("access_token")
	fromGroup := r.FormValue("from_group")

	// Валидация
	if ownerId == "" || accessToken == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(VKPostResponse{Error: "owner_id and access_token are required"})
		return
	}

	if message == "" && r.MultipartForm.File["photos"] == nil && r.MultipartForm.File["video"] == nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(VKPostResponse{Error: "message, photos or video is required"})
		return
	}

	// Отправляем запрос в VK Service
	vkServiceURL := os.Getenv("VK_SERVICE_URL")
	if vkServiceURL == "" {
		vkServiceURL = "http://localhost:5000"
	}

	// Создаем новый multipart writer для пересылки в VK Service
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	// Добавляем текстовые поля
	writer.WriteField("access_token", accessToken)
	writer.WriteField("owner_id", ownerId)
	writer.WriteField("message", message)
	if fromGroup != "" {
		writer.WriteField("from_group", fromGroup)
	}

	// Добавляем фотографии
	if photos := r.MultipartForm.File["photos"]; photos != nil {
		for _, fileHeader := range photos {
			file, err := fileHeader.Open()
			if err != nil {
				continue
			}
			defer file.Close()

			part, err := writer.CreateFormFile("photos", fileHeader.Filename)
			if err != nil {
				continue
			}
			io.Copy(part, file)
		}
	}

	// Добавляем видео
	if video := r.MultipartForm.File["video"]; len(video) > 0 {
		fileHeader := video[0]
		file, err := fileHeader.Open()
		if err == nil {
			defer file.Close()
			part, err := writer.CreateFormFile("video", fileHeader.Filename)
			if err == nil {
				io.Copy(part, file)
			}
		}
	}

	writer.Close()

	resp, err := http.Post(vkServiceURL+"/vk/wall/post", writer.FormDataContentType(), body)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(VKPostResponse{Error: fmt.Sprintf("VK Service error: %v", err)})
		return
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(VKPostResponse{Error: "Failed to read response"})
		return
	}

	var result struct {
		PostID int    `json:"post_id"`
		Error  string `json:"error"`
	}

	if err := json.Unmarshal(respBody, &result); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(VKPostResponse{Error: "Failed to parse response"})
		return
	}

	if result.Error != "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(VKPostResponse{Error: result.Error})
		return
	}

	// Успешный ответ
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(VKPostResponse{PostID: result.PostID})
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

// VK OAuth обмен кода на токен
func vkExchangeCodeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Code         string `json:"code"`
		RedirectURI  string `json:"redirect_uri"`
		DeviceID     string `json:"device_id"`
		CodeVerifier string `json:"code_verifier"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body"})
		return
	}

	if req.Code == "" || req.RedirectURI == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "code and redirect_uri are required"})
		return
	}

	// Получаем токен из VK ID
	appID := os.Getenv("VK_APP_ID")
	clientSecret := os.Getenv("VK_CLIENT_SECRET")

	// Если переменные не установлены, используем значения по умолчанию
	if appID == "" {
		appID = "54481712"
	}
	if clientSecret == "" {
		clientSecret = "488uLwXVh0NbUFcrJIvA"
	}

	log.Printf("Using App ID: %s", appID)

	// Для VK ID используем новый endpoint
	vkURL := "https://id.vk.com/oauth2/auth"

	reqBody := map[string]string{
		"grant_type":    "authorization_code",
		"code":          req.Code,
		"redirect_uri":  req.RedirectURI,
		"client_id":     appID,
		"client_secret": clientSecret,
	}

	// Добавляем device_id только если он передан
	if req.DeviceID != "" {
		reqBody["device_id"] = req.DeviceID
	}

	// Добавляем code_verifier для PKCE
	if req.CodeVerifier != "" {
		reqBody["code_verifier"] = req.CodeVerifier
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to prepare request"})
		return
	}

	resp, err := http.Post(vkURL, "application/json", bytes.NewBuffer(jsonData))
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
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		ExpiresIn    int    `json:"expires_in"`
		UserID       int    `json:"user_id"`
		Error        string `json:"error"`
		ErrorDesc    string `json:"error_description"`
	}

	if err := json.Unmarshal(body, &vkResp); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to parse VK response"})
		return
	}

	// Проверяем на ошибки VK
	if vkResp.Error != "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": fmt.Sprintf("VK Error: %s - %s", vkResp.Error, vkResp.ErrorDesc),
		})
		return
	}

	// Успешный ответ
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(vkResp)
}

func vkUserInfoHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		AccessToken string `json:"access_token"`
		UserID      int    `json:"user_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body"})
		return
	}

	// Отправляем запрос в VK Service
	vkServiceURL := os.Getenv("VK_SERVICE_URL")
	if vkServiceURL == "" {
		vkServiceURL = "http://localhost:5000"
	}

	payload := map[string]interface{}{
		"access_token": req.AccessToken,
		"user_ids":     fmt.Sprintf("%d", req.UserID),
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to prepare request"})
		return
	}

	log.Printf("Calling VK Service at: %s/vk/users/get", vkServiceURL)

	resp, err := http.Post(vkServiceURL+"/vk/users/get", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		log.Printf("VK Service connection error: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": fmt.Sprintf("VK Service недоступен: %v", err)})
		return
	}
	defer resp.Body.Close()

	log.Printf("VK Service response status: %d", resp.StatusCode)

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Failed to read VK Service response: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to read response"})
		return
	}

	log.Printf("VK Service response body: %s", string(body))

	// Отправляем ответ как есть
	w.Header().Set("Content-Type", "application/json")
	w.Write(body)
}

// Обновление токена через refresh_token
func vkRefreshTokenHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		RefreshToken string `json:"refresh_token"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body"})
		return
	}

	if req.RefreshToken == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "refresh_token is required"})
		return
	}

	// Получаем новый токен
	appID := os.Getenv("VK_APP_ID")
	clientSecret := os.Getenv("VK_CLIENT_SECRET")

	if appID == "" {
		appID = "54481712"
	}
	if clientSecret == "" {
		clientSecret = "488uLwXVh0NbUFcrJIvA"
	}

	vkURL := "https://id.vk.com/oauth2/auth"

	reqBody := map[string]string{
		"grant_type":    "refresh_token",
		"refresh_token": req.RefreshToken,
		"client_id":     appID,
		"client_secret": clientSecret,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to prepare request"})
		return
	}

	resp, err := http.Post(vkURL, "application/json", bytes.NewBuffer(jsonData))
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

	var vkResp struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		ExpiresIn    int    `json:"expires_in"`
		UserID       int    `json:"user_id"`
		Error        string `json:"error"`
		ErrorDesc    string `json:"error_description"`
	}

	if err := json.Unmarshal(body, &vkResp); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to parse VK response"})
		return
	}

	if vkResp.Error != "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": fmt.Sprintf("VK Error: %s - %s", vkResp.Error, vkResp.ErrorDesc),
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(vkResp)
}

func vkServiceKeyHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	serviceKey := os.Getenv("VK_SERVICE_KEY")
	if serviceKey == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Service key not configured"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"service_key": serviceKey})
}

func vkGetPostsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		AccessToken string `json:"access_token"`
		OwnerID     string `json:"owner_id"`
		Count       int    `json:"count"`
		Offset      int    `json:"offset"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body"})
		return
	}

	if req.AccessToken == "" || req.OwnerID == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "access_token and owner_id are required"})
		return
	}

	if req.Count == 0 {
		req.Count = 10
	}

	// Отправляем запрос в VK Service
	vkServiceURL := os.Getenv("VK_SERVICE_URL")
	if vkServiceURL == "" {
		vkServiceURL = "http://localhost:5000"
	}

	payload := map[string]interface{}{
		"access_token": req.AccessToken,
		"owner_id":     req.OwnerID,
		"count":        req.Count,
		"offset":       req.Offset,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to prepare request"})
		return
	}

	resp, err := http.Post(vkServiceURL+"/vk/wall/get", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": fmt.Sprintf("VK Service error: %v", err)})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to read response"})
		return
	}

	// Отправляем ответ как есть
	w.Header().Set("Content-Type", "application/json")
	w.Write(body)
}

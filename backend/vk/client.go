package vk

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

const (
	VKAPIURL     = "https://api.vk.com/method"
	VKAPIVersion = "5.131"
)

// VKClient - клиент для работы с VK API
type VKClient struct {
	AccessToken string
	HTTPClient  *http.Client
}

// NewVKClient создает новый VK API клиент
func NewVKClient(accessToken string) *VKClient {
	return &VKClient{
		AccessToken: accessToken,
		HTTPClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// VKError представляет ошибку VK API
type VKError struct {
	ErrorCode int    `json:"error_code"`
	ErrorMsg  string `json:"error_msg"`
}

// VKResponse базовая структура ответа VK API
type VKResponse struct {
	Response json.RawMessage `json:"response"`
	Error    *VKError        `json:"error"`
}

// CallMethod вызывает метод VK API (с таймаутом по умолчанию 15 секунд)
func (c *VKClient) CallMethod(method string, params map[string]string) (json.RawMessage, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	return c.CallMethodContext(ctx, method, params)
}

// CallMethodContext вызывает метод VK API с поддержкой контекста и автоматическими повторами (Retries)
func (c *VKClient) CallMethodContext(ctx context.Context, method string, params map[string]string) (json.RawMessage, error) {
	values := url.Values{}
	values.Set("access_token", c.AccessToken)
	values.Set("v", VKAPIVersion)

	for key, value := range params {
		values.Set(key, value)
	}

	apiURL := fmt.Sprintf("%s/%s", VKAPIURL, method)
	maxRetries := 3
	var lastErr error

	for i := 0; i < maxRetries; i++ {
		req, err := http.NewRequestWithContext(ctx, "POST", apiURL, strings.NewReader(values.Encode()))
		if err != nil {
			return nil, fmt.Errorf("failed to create request: %w", err)
		}
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

		resp, err := c.HTTPClient.Do(req)
		if err != nil {
			lastErr = fmt.Errorf("HTTP request failed: %w", err)
			// При сетевой ошибке (или таймауте) пробуем снова, если контекст еще жив
			if ctx.Err() != nil {
				return nil, ctx.Err()
			}
			time.Sleep(time.Duration(i+1) * 500 * time.Millisecond)
			continue
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			lastErr = fmt.Errorf("failed to read response: %w", err)
			time.Sleep(time.Duration(i+1) * 500 * time.Millisecond)
			continue
		}

		// Если VK вернул ошибку шлюза или внутреннюю ошибку (5xx), пробуем снова
		if resp.StatusCode >= 500 {
			lastErr = fmt.Errorf("VK server error %d", resp.StatusCode)
			time.Sleep(time.Duration(i+1) * time.Second)
			continue
		}

		var vkResp VKResponse
		if err := json.Unmarshal(body, &vkResp); err != nil {
			lastErr = fmt.Errorf("failed to parse response: %w", err)
			time.Sleep(time.Duration(i+1) * 500 * time.Millisecond)
			continue
		}

		if vkResp.Error != nil {
			// Ошибка 6 - Too many requests per second
			// Ошибка 9 - Flood control
			// Ошибка 10 - Internal server error
			if vkResp.Error.ErrorCode == 6 || vkResp.Error.ErrorCode == 9 || vkResp.Error.ErrorCode == 10 {
				lastErr = fmt.Errorf("VK API Error [%d]: %s", vkResp.Error.ErrorCode, vkResp.Error.ErrorMsg)
				time.Sleep(time.Duration(i+1) * time.Second)
				continue
			}
			// Другие ошибки не повторяем (например, неверный токен)
			return nil, fmt.Errorf("VK API Error [%d]: %s", vkResp.Error.ErrorCode, vkResp.Error.ErrorMsg)
		}

		return vkResp.Response, nil
	}

	return nil, fmt.Errorf("max retries exceeded, last error: %v", lastErr)
}

// UploadServer структура для получения URL загрузки
type UploadServer struct {
	UploadURL string `json:"upload_url"`
	AlbumID   int    `json:"album_id"`
	UserID    int    `json:"user_id"`
}

// PhotoUploadResponse ответ после загрузки фото
type PhotoUploadResponse struct {
	Server int    `json:"server"`
	Photo  string `json:"photo"`
	Hash   string `json:"hash"`
}

// SavedPhoto сохраненное фото
type SavedPhoto struct {
	ID        int `json:"id"`
	OwnerID   int `json:"owner_id"`
	Photo75   string `json:"photo_75"`
	Photo130  string `json:"photo_130"`
	Photo604  string `json:"photo_604"`
	Photo807  string `json:"photo_807"`
	Photo1280 string `json:"photo_1280"`
	Photo2560 string `json:"photo_2560"`
	Sizes     []struct {
		URL  string `json:"url"`
		Type string `json:"type"`
	} `json:"sizes"`
}

// UploadPhotoToWall загружает фото на стену
func (c *VKClient) UploadPhotoToWall(filePath string, groupID string) (string, string, error) {
	// 1. Получаем URL для загрузки
	params := map[string]string{}
	if groupID != "" {
		params["group_id"] = groupID
	}

	uploadServerResp, err := c.CallMethod("photos.getWallUploadServer", params)
	if err != nil {
		return "", "", fmt.Errorf("failed to get upload server: %w", err)
	}

	var uploadServer UploadServer
	if err := json.Unmarshal(uploadServerResp, &uploadServer); err != nil {
		return "", "", fmt.Errorf("failed to parse upload server: %w", err)
	}

	// 2. Загружаем файл
	file, err := os.Open(filePath)
	if err != nil {
		return "", "", fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("photo", filepath.Base(filePath))
	if err != nil {
		return "", "", fmt.Errorf("failed to create form file: %w", err)
	}

	if _, err := io.Copy(part, file); err != nil {
		return "", "", fmt.Errorf("failed to copy file: %w", err)
	}
	writer.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, "POST", uploadServer.UploadURL, body)
	if err != nil {
		return "", "", fmt.Errorf("failed to create upload request: %w", err)
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("failed to upload file: %w", err)
	}
	defer resp.Body.Close()

	uploadRespBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", "", fmt.Errorf("failed to read upload response: %w", err)
	}

	var photoUpload PhotoUploadResponse
	if err := json.Unmarshal(uploadRespBody, &photoUpload); err != nil {
		return "", "", fmt.Errorf("failed to parse upload response: %w", err)
	}

	// 3. Сохраняем фото
	saveParams := map[string]string{
		"photo":  photoUpload.Photo,
		"server": strconv.Itoa(photoUpload.Server),
		"hash":   photoUpload.Hash,
	}
	if groupID != "" {
		saveParams["group_id"] = groupID
	}

	savedResp, err := c.CallMethod("photos.saveWallPhoto", saveParams)
	if err != nil {
		return "", "", fmt.Errorf("failed to save photo: %w", err)
	}

	var savedPhotos []SavedPhoto
	if err := json.Unmarshal(savedResp, &savedPhotos); err != nil {
		return "", "", fmt.Errorf("failed to parse saved photo: %w", err)
	}

	if len(savedPhotos) == 0 {
		return "", "", fmt.Errorf("no photos saved")
	}

	photo := savedPhotos[0]
	photoURL := ""
	if len(photo.Sizes) > 0 {
		photoURL = photo.Sizes[len(photo.Sizes)-1].URL
	} else {
		// Fallback for legacy VK API formats
		if photo.Photo2560 != "" {
			photoURL = photo.Photo2560
		} else if photo.Photo1280 != "" {
			photoURL = photo.Photo1280
		} else if photo.Photo807 != "" {
			photoURL = photo.Photo807
		} else if photo.Photo604 != "" {
			photoURL = photo.Photo604
		} else if photo.Photo130 != "" {
			photoURL = photo.Photo130
		} else if photo.Photo75 != "" {
			photoURL = photo.Photo75
		}
	}
	log.Printf("[UploadPhotoToWall] RAW savedResp: %s", string(savedResp))
	log.Printf("[UploadPhotoToWall] Extracted photoURL: %s", photoURL)
	return fmt.Sprintf("photo%d_%d", photo.OwnerID, photo.ID), photoURL, nil
}

// SendDirectMessage отправляет личное сообщение пользователю от имени группы
func (c *VKClient) SendDirectMessage(userID int, message string) error {
	params := map[string]string{
		"user_id":   strconv.Itoa(userID),
		"message":   message,
		"random_id": strconv.FormatInt(time.Now().UnixNano(), 10),
	}
	_, err := c.CallMethod("messages.send", params)
	return err
}

// SendNotification отправляет разовое уведомление пользователю в колокольчик
// Требуется сервисный ключ доступа (Service Token).
func (c *VKClient) SendNotification(userIDs string, message string) error {
	params := map[string]string{
		"user_ids": userIDs,
		"message":  message,
	}
	_, err := c.CallMethod("notifications.sendMessage", params)
	return err
}

// CheckMessagesAllowed проверяет статус подписки на сообщения для списка пользователей.
// Использует метод execute для пакетной обработки (до 25 за один внутренний вызов).
func (c *VKClient) CheckMessagesAllowed(groupID int, userIDs []int) (map[int]bool, error) {
	result := make(map[int]bool)
	if len(userIDs) == 0 {
		return result, nil
	}

	for i := 0; i < len(userIDs); i += 25 {
		end := i + 25
		if end > len(userIDs) {
			end = len(userIDs)
		}
		chunk := userIDs[i:end]

		var usersArray []string
		for _, uid := range chunk {
			usersArray = append(usersArray, strconv.Itoa(uid))
		}

		script := fmt.Sprintf(`
			var users = [%s];
			var res = [];
			var i = 0;
			while (i < users.length) {
				res.push(API.messages.isMessagesFromGroupAllowed({group_id: %d, user_id: users[i]}));
				i = i + 1;
			}
			return res;
		`, strings.Join(usersArray, ","), groupID)

		resp, err := c.CallMethod("execute", map[string]string{
			"code": script,
		})
		if err != nil {
			return nil, err
		}

		var statuses []struct {
			IsAllowed int `json:"is_allowed"`
		}
		if err := json.Unmarshal(resp, &statuses); err != nil {
			return nil, err
		}

		for j, status := range statuses {
			if j < len(chunk) {
				result[chunk[j]] = status.IsAllowed == 1
			}
		}
	}

	return result, nil
}

func (c *VKClient) GetCallbackConfirmationCode(groupID int) (string, error) {
	resp, err := c.CallMethod("groups.getCallbackConfirmationCode", map[string]string{
		"group_id": strconv.Itoa(groupID),
	})
	if err != nil {
		return "", err
	}
	var code struct {
		Code string `json:"code"`
	}
	if err := json.Unmarshal(resp, &code); err != nil {
		return "", err
	}
	return code.Code, nil
}

func (c *VKClient) AddCallbackServer(groupID int, serverURL string, title string) (int, error) {
	resp, err := c.CallMethod("groups.addCallbackServer", map[string]string{
		"group_id": strconv.Itoa(groupID),
		"url":      serverURL,
		"title":    title,
	})
	if err != nil {
		return 0, err
	}
	var res struct {
		ServerID int `json:"server_id"`
	}
	if err := json.Unmarshal(resp, &res); err != nil {
		return 0, err
	}
	return res.ServerID, nil
}

type CallbackServer struct {
	ID        int    `json:"id"`
	Title     string `json:"title"`
	CreatorID int    `json:"creator_id"`
	URL       string `json:"url"`
	SecretKey string `json:"secret_key"`
	Status    string `json:"status"`
}

func (c *VKClient) GetCallbackServers(groupID int) ([]CallbackServer, error) {
	resp, err := c.CallMethod("groups.getCallbackServers", map[string]string{
		"group_id": strconv.Itoa(groupID),
	})
	if err != nil {
		return nil, err
	}
	var res struct {
		Count int              `json:"count"`
		Items []CallbackServer `json:"items"`
	}
	if err := json.Unmarshal(resp, &res); err != nil {
		return nil, err
	}
	return res.Items, nil
}

func (c *VKClient) SetCallbackSettings(groupID int, serverID int) error {
	params := map[string]string{
		"group_id":       strconv.Itoa(groupID),
		"server_id":      strconv.Itoa(serverID),
		"message_new":    "1",
		"wall_reply_new": "1",
	}
	_, err := c.CallMethod("groups.setCallbackSettings", params)
	return err
}

// VideoSaveResponse ответ метода video.save
type VideoSaveResponse struct {
	UploadURL string `json:"upload_url"`
	VideoID   int    `json:"video_id"`
	OwnerID   int    `json:"owner_id"`
	AccessKey string `json:"access_key"`
}

// GetVideoUploadUrl запрашивает ссылку для прямой загрузки видео
func (c *VKClient) GetVideoUploadUrl(groupID string, fileName string) (*VideoSaveResponse, error) {
	params := map[string]string{
		"name": fileName,
	}
	if groupID != "" {
		params["group_id"] = groupID
	}

	saveResp, err := c.CallMethod("video.save", params)
	if err != nil {
		return nil, fmt.Errorf("failed to call video.save: %w", err)
	}

	var videoSave VideoSaveResponse
	if err := json.Unmarshal(saveResp, &videoSave); err != nil {
		return nil, fmt.Errorf("failed to parse video.save response: %w", err)
	}

	return &videoSave, nil
}

// VideoInfo информация о видео из video.get
type VideoInfo struct {
	ID       int    `json:"id"`
	OwnerID  int    `json:"owner_id"`
	Title    string `json:"title"`
	Photo130 string `json:"photo_130"`
	Photo320 string `json:"photo_320"`
	Photo800 string `json:"photo_800"`
	// Image — новый формат (может содержать анимированные URL iv.okcdn.ru)
	Image []struct {
		URL    string `json:"url"`
		Width  int    `json:"width"`
		Height int    `json:"height"`
	} `json:"image"`
	// FirstFrame — статичные кадры JPEG (более надёжны для <img>)
	FirstFrame []struct {
		URL    string `json:"url"`
		Width  int    `json:"width"`
		Height int    `json:"height"`
	} `json:"first_frame"`
}

// isStaticThumbnail проверяет, является ли URL статичным JPEG превью (a не анимированным)
func isStaticThumbnail(url string) bool {
	// iv.okcdn.ru/getVideoPreview — это анимированное WebM/MP4 превью, не JPEG
	if strings.Contains(url, "iv.okcdn.ru") {
		return false
	}
	if strings.Contains(url, "fn=vid_x") || strings.Contains(url, "fn=vid.") {
		return false
	}
	return true
}

// bestImage выбирает наибольшее изображение из массива (фильтр опционален)
func bestImage(items []struct {
	URL    string `json:"url"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
}, staticOnly bool) string {
	var best struct {
		URL   string
		Width int
	}
	for _, img := range items {
		if staticOnly && !isStaticThumbnail(img.URL) {
			continue
		}
		if img.Width > best.Width || best.URL == "" {
			best.URL = img.URL
			best.Width = img.Width
		}
	}
	return best.URL
}

// GetVideoThumbnails получает URL превью для списка видео-вложений.
// attachmentIDs — строки вида "video-12345_67890" или "video-12345_67890_accesskey".
func (c *VKClient) GetVideoThumbnails(attachmentIDs []string) (map[string]string, error) {
	if len(attachmentIDs) == 0 {
		return make(map[string]string), nil
	}

	var videos []string
	for _, attachmentID := range attachmentIDs {
		raw := strings.TrimPrefix(attachmentID, "video")
		videos = append(videos, raw)
	}

	params := map[string]string{
		"videos": strings.Join(videos, ","),
	}

	resp, err := c.CallMethod("video.get", params)
	if err != nil {
		return nil, fmt.Errorf("video.get failed: %w", err)
	}

	var result struct {
		Count int         `json:"count"`
		Items []VideoInfo `json:"items"`
	}
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, fmt.Errorf("failed to parse video.get response: %w", err)
	}

	thumbnails := make(map[string]string)
	for _, v := range result.Items {
		id := fmt.Sprintf("video%d_%d", v.OwnerID, v.ID)
		
		url := ""
		if best := bestImage(v.FirstFrame, false); best != "" {
			url = best
		} else if best := bestImage(v.Image, true); best != "" {
			url = best
		} else if v.Photo800 != "" {
			url = v.Photo800
		} else if v.Photo320 != "" {
			url = v.Photo320
		} else if v.Photo130 != "" {
			url = v.Photo130
		} else if best := bestImage(v.Image, false); best != "" {
			url = best
		}
		
		if url != "" {
			thumbnails[id] = url
		}
	}

	return thumbnails, nil
}

// GetVideoThumbnail получает URL превью для одного видео-вложения.
func (c *VKClient) GetVideoThumbnail(attachmentID string) (string, error) {
	thumbs, err := c.GetVideoThumbnails([]string{attachmentID})
	if err != nil {
		return "", err
	}
	
	raw := strings.TrimPrefix(attachmentID, "video")
	partsRaw := strings.SplitN(raw, "_", 3)
	if len(partsRaw) < 2 {
		return "", fmt.Errorf("invalid video attachment id: %s", attachmentID)
	}
	baseID := fmt.Sprintf("video%s_%s", partsRaw[0], partsRaw[1])
	
	if url, ok := thumbs[baseID]; ok {
		return url, nil
	}
	return "", fmt.Errorf("video not found: %s", attachmentID)
}

// UploadVideo загружает видео
func (c *VKClient) UploadVideo(filePath string, groupID string, fileName string) (string, string, error) {
	// 1. Получаем URL для загрузки
	params := map[string]string{
		"name": fileName,
	}
	if groupID != "" {
		params["group_id"] = groupID
	}

	saveResp, err := c.CallMethod("video.save", params)
	if err != nil {
		return "", "", fmt.Errorf("failed to call video.save: %w", err)
	}

	var videoSave VideoSaveResponse
	if err := json.Unmarshal(saveResp, &videoSave); err != nil {
		return "", "", fmt.Errorf("failed to parse video.save response: %w", err)
	}

	// 2. Загружаем файл
	file, err := os.Open(filePath)
	if err != nil {
		return "", "", fmt.Errorf("failed to open video file: %w", err)
	}
	defer file.Close()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("video_file", fileName)
	if err != nil {
		return "", "", fmt.Errorf("failed to create form file for video: %w", err)
	}

	if _, err := io.Copy(part, file); err != nil {
		return "", "", fmt.Errorf("failed to copy video file: %w", err)
	}
	writer.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, "POST", videoSave.UploadURL, body)
	if err != nil {
		return "", "", fmt.Errorf("failed to create video upload request: %w", err)
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("failed to upload video file: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("video upload failed with status: %d", resp.StatusCode)
	}

	// Формируем attachment строку
	attachment := fmt.Sprintf("video%d_%d", videoSave.OwnerID, videoSave.VideoID)
	return attachment, "", nil
}

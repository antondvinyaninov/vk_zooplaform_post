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

var (
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

// CommunityTokenHasWall проверяет groups.getTokenPermissions: галка «Стена».
// Токен Mini App / user сюда не подходит (ошибка 5/15/28).
func CommunityTokenHasWall(token string) (bool, error) {
	token = strings.TrimSpace(token)
	if token == "" {
		return false, nil
	}
	if os.Getenv("IS_TESTING") == "true" {
		return true, nil
	}
	raw, err := NewVKClient(token).CallMethod("groups.getTokenPermissions", map[string]string{})
	if err != nil {
		return false, err
	}
	var resp struct {
		Permissions []struct {
			Name string `json:"name"`
		} `json:"permissions"`
	}
	if err := json.Unmarshal(raw, &resp); err != nil {
		return false, err
	}
	for _, p := range resp.Permissions {
		if p.Name == "wall" {
			return true, nil
		}
	}
	return false, nil
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
			apiErr := *vkResp.Error
			// Ошибка 6 - Too many requests per second
			// Ошибка 9 - Flood control
			// Ошибка 10 - Internal server error
			if apiErr.ErrorCode == 6 || apiErr.ErrorCode == 9 || apiErr.ErrorCode == 10 {
				lastErr = &apiErr
				time.Sleep(time.Duration(i+1) * time.Second)
				continue
			}
			return nil, &apiErr
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
	ID        int    `json:"id"`
	OwnerID   int    `json:"owner_id"`
	AccessKey string `json:"access_key,omitempty"`
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

// UploadPhotoToWall грузит фото в альбом стены: photos.getWallUploadServer + photos.saveWallPhoto.
// Ключ сообщества даёт VK 27. Нельзя подменять это photos.saveMessagesPhoto:
// такие фото в альбоме сообщений и на стене не видны.
func (c *VKClient) UploadPhotoToWall(filePath string, groupID string) (string, string, error) {
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

	photoUpload, err := c.uploadPhotoFile(filePath, uploadServer.UploadURL)
	if err != nil {
		return "", "", err
	}

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

	return attachmentFromSavedPhotos(savedResp)
}

// ProbeWallPhotoUpload проверяет, что токен умеет photos.getWallUploadServer для группы.
func (c *VKClient) ProbeWallPhotoUpload(groupID string) error {
	if c == nil {
		return fmt.Errorf("%s", GroupWallTokenMissing)
	}
	groupID = strings.TrimSpace(groupID)
	if groupID == "" {
		return fmt.Errorf("group_id required")
	}
	raw, err := c.CallMethod("photos.getWallUploadServer", map[string]string{"group_id": groupID})
	if err != nil {
		return err
	}
	var resp struct {
		UploadURL string `json:"upload_url"`
	}
	if err := json.Unmarshal(raw, &resp); err != nil {
		return fmt.Errorf("failed to parse getWallUploadServer: %w", err)
	}
	if strings.TrimSpace(resp.UploadURL) == "" {
		return fmt.Errorf("photos.getWallUploadServer: empty upload_url")
	}
	return nil
}

// IsAllowedVKUploadURL проверяет, что URL — загрузка VK, а не произвольный хост.
func IsAllowedVKUploadURL(raw string) bool {
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || u.Host == "" {
		return false
	}
	if u.Scheme != "https" && u.Scheme != "http" {
		return false
	}
	host := strings.ToLower(u.Hostname())
	if host == "vk.com" || host == "vk.ru" || host == "userapi.com" {
		return true
	}
	return strings.HasSuffix(host, ".vk.com") || strings.HasSuffix(host, ".vk.ru") || strings.HasSuffix(host, ".userapi.com")
}

// PostPhotoToUploadURL шлёт файл на upload_url от photos.getWallUploadServer.
// Сам POST на pu.vk.com не требует access_token.
func PostPhotoToUploadURL(filePath, uploadURL string) (*PhotoUploadResponse, error) {
	if !IsAllowedVKUploadURL(uploadURL) {
		return nil, fmt.Errorf("upload_url is not a VK photo host")
	}
	return NewVKClient("").uploadPhotoFile(filePath, uploadURL)
}

// UploadPhotoForGroupWall сначала пробует photos.getWallUploadServer ключом сообщества.
// Это VK 27 — тогда грузим user-токеном photos.saveWallPhoto (альбом стены).
// photos.saveMessagesPhoto на стене не рисуется: только текст, без превью.
func UploadPhotoForGroupWall(groupClient *VKClient, userToken, filePath, groupID string) (string, string, error) {
	if groupClient == nil {
		return "", "", fmt.Errorf("%s", GroupWallTokenMissing)
	}
	att, photoURL, err := groupClient.UploadPhotoToWall(filePath, groupID)
	if err == nil {
		return att, photoURL, nil
	}
	userToken = strings.TrimSpace(userToken)
	if userToken == "" {
		return "", "", fmt.Errorf("%s (%v)", GroupCannotUploadWallPhoto, err)
	}
	log.Printf("[UploadPhotoToWall] community upload failed (%v); uploading with user photos token", err)
	return NewVKClient(userToken).UploadPhotoToWall(filePath, groupID)
}

// UploadPhotoViaGroupMessages грузит JPEG ключом сообщества в альбом сообщений (-64).
// Owner получается отрицательный (группа). Это не photos.saveWallPhoto, но вложение
// photo-{group}_{id} принимается wall.post.
func (c *VKClient) UploadPhotoViaGroupMessages(filePath string) (string, string, error) {
	if c == nil {
		return "", "", fmt.Errorf("%s", GroupWallTokenMissing)
	}
	raw, err := c.CallMethod("photos.getMessagesUploadServer", map[string]string{})
	if err != nil {
		return "", "", fmt.Errorf("photos.getMessagesUploadServer: %w", err)
	}
	var uploadServer UploadServer
	if err := json.Unmarshal(raw, &uploadServer); err != nil {
		return "", "", fmt.Errorf("failed to parse messages upload server: %w", err)
	}
	if strings.TrimSpace(uploadServer.UploadURL) == "" {
		return "", "", fmt.Errorf("photos.getMessagesUploadServer: empty upload_url")
	}
	photoUpload, err := c.uploadPhotoFile(filePath, uploadServer.UploadURL)
	if err != nil {
		return "", "", err
	}
	savedResp, err := c.CallMethod("photos.saveMessagesPhoto", map[string]string{
		"photo":  photoUpload.Photo,
		"server": strconv.Itoa(photoUpload.Server),
		"hash":   photoUpload.Hash,
	})
	if err != nil {
		return "", "", fmt.Errorf("photos.saveMessagesPhoto: %w", err)
	}
	return attachmentFromSavedPhotos(savedResp)
}

func (c *VKClient) uploadPhotoFile(filePath, uploadURL string) (*PhotoUploadResponse, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("photo", filepath.Base(filePath))
	if err != nil {
		return nil, fmt.Errorf("failed to create form file: %w", err)
	}

	if _, err := io.Copy(part, file); err != nil {
		return nil, fmt.Errorf("failed to copy file: %w", err)
	}
	writer.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, "POST", uploadURL, body)
	if err != nil {
		return nil, fmt.Errorf("failed to create upload request: %w", err)
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to upload file: %w", err)
	}
	defer resp.Body.Close()

	uploadRespBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read upload response: %w", err)
	}

	var photoUpload PhotoUploadResponse
	if err := json.Unmarshal(uploadRespBody, &photoUpload); err != nil {
		return nil, fmt.Errorf("failed to parse upload response: %w", err)
	}
	return &photoUpload, nil
}

func attachmentFromSavedPhotos(savedResp json.RawMessage) (string, string, error) {
	var savedPhotos []SavedPhoto
	if err := json.Unmarshal(savedResp, &savedPhotos); err != nil {
		return "", "", fmt.Errorf("failed to parse saved photo: %w", err)
	}

	if len(savedPhotos) == 0 {
		return "", "", fmt.Errorf("no photos saved")
	}

	photo := savedPhotos[0]
	photoURL := savedPhotoURL(photo)
	log.Printf("[UploadPhotoToWall] Extracted photoURL: %s owner=%d id=%d", photoURL, photo.OwnerID, photo.ID)
	att := fmt.Sprintf("photo%d_%d", photo.OwnerID, photo.ID)
	if photo.AccessKey != "" {
		att += "_" + photo.AccessKey
	}
	return att, photoURL, nil
}

func savedPhotoURL(photo SavedPhoto) string {
	if len(photo.Sizes) > 0 {
		return photo.Sizes[len(photo.Sizes)-1].URL
	}
	for _, u := range []string{photo.Photo2560, photo.Photo1280, photo.Photo807, photo.Photo604, photo.Photo130, photo.Photo75} {
		if u != "" {
			return u
		}
	}
	return ""
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

// SendNotification отправляет разовое уведомление пользователю в колокольчик.
// Требуется сервисный ключ доступа мини-приложения.
func (c *VKClient) SendNotification(userIDs string, message string) error {
	return c.SendNotificationWithFragment(userIDs, message, "")
}

// SendNotificationWithFragment отправляет уведомление с hash-фрагментом для перехода
// на конкретный экран мини-приложения.
func (c *VKClient) SendNotificationWithFragment(userIDs string, message string, fragment string) error {
	params := map[string]string{
		"user_ids": userIDs,
		"message":  message,
	}
	if fragment != "" {
		params["fragment"] = fragment
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

type VideoUploadResult struct {
	Size      int64  `json:"size"`
	VideoID   int    `json:"video_id"`
	OwnerID   int    `json:"owner_id"`
	Error     string `json:"error"`
	ErrorMsg  string `json:"error_msg"`
	ErrorCode int    `json:"error_code"`
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

// GetPhotoURLs получает URL картинок для вложений вида photo{owner}_{id}[_access_key].
func (c *VKClient) GetPhotoURLs(attachmentIDs []string) (map[string]string, error) {
	urls := make(map[string]string)
	if c == nil || len(attachmentIDs) == 0 {
		return urls, nil
	}
	var photos []string
	seen := make(map[string]bool)
	for _, attachmentID := range attachmentIDs {
		raw := strings.TrimPrefix(strings.TrimSpace(attachmentID), "photo")
		if raw == "" || seen[raw] {
			continue
		}
		seen[raw] = true
		photos = append(photos, raw)
	}
	if len(photos) == 0 {
		return urls, nil
	}
	resp, err := c.CallMethod("photos.getById", map[string]string{
		"photos":      strings.Join(photos, ","),
		"photo_sizes": "1",
	})
	if err != nil {
		return nil, fmt.Errorf("photos.getById failed: %w", err)
	}
	var items []SavedPhoto
	if err := json.Unmarshal(resp, &items); err != nil {
		return nil, fmt.Errorf("failed to parse photos.getById: %w", err)
	}
	for _, photo := range items {
		id := fmt.Sprintf("photo%d_%d", photo.OwnerID, photo.ID)
		if u := savedPhotoURL(photo); u != "" {
			urls[id] = u
		}
	}
	return urls, nil
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

	uploadRespBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", "", fmt.Errorf("failed to read video upload response: %w", err)
	}

	var uploadResult VideoUploadResult
	if err := json.Unmarshal(uploadRespBody, &uploadResult); err != nil {
		return "", "", fmt.Errorf("failed to parse video upload response: %w; raw response: %s", err, string(uploadRespBody))
	}
	if uploadResult.Error != "" || uploadResult.ErrorMsg != "" || uploadResult.ErrorCode != 0 {
		return "", "", fmt.Errorf("video upload returned error: code=%d error=%s message=%s raw=%s",
			uploadResult.ErrorCode, uploadResult.Error, uploadResult.ErrorMsg, string(uploadRespBody))
	}

	// Формируем attachment строку
	attachment := fmt.Sprintf("video%d_%d", videoSave.OwnerID, videoSave.VideoID)
	if videoSave.AccessKey != "" {
		attachment = fmt.Sprintf("video%d_%d_%s", videoSave.OwnerID, videoSave.VideoID, videoSave.AccessKey)
	}
	return attachment, "", nil
}

package vk

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
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

// CallMethod вызывает метод VK API
func (c *VKClient) CallMethod(method string, params map[string]string) (json.RawMessage, error) {
	values := url.Values{}
	values.Set("access_token", c.AccessToken)
	values.Set("v", VKAPIVersion)

	for key, value := range params {
		values.Set(key, value)
	}

	apiURL := fmt.Sprintf("%s/%s", VKAPIURL, method)
	resp, err := c.HTTPClient.PostForm(apiURL, values)
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var vkResp VKResponse
	if err := json.Unmarshal(body, &vkResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if vkResp.Error != nil {
		return nil, fmt.Errorf("VK API Error [%d]: %s", vkResp.Error.ErrorCode, vkResp.Error.ErrorMsg)
	}

	return vkResp.Response, nil
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
	ID      int `json:"id"`
	OwnerID int `json:"owner_id"`
	Sizes   []struct {
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

	req, err := http.NewRequest("POST", uploadServer.UploadURL, body)
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
	}
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

	req, err := http.NewRequest("POST", videoSave.UploadURL, body)
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

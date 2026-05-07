package vkapp

import (

	"backend/vk"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"
)

// respondJSON отправляет JSON-ответ
func respondJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(payload)
}

// appPostByLinkPreviewHandler получает ссылку на пост ВКонтакте и возвращает текст с медиа
func appPostByLinkPreviewHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}

	link := r.URL.Query().Get("link")
	if link == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Link is required"})
		return
	}

	re := regexp.MustCompile(`wall(-?\d+_\d+)`)
	matches := re.FindStringSubmatch(link)
	if len(matches) < 2 {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid VK post link format"})
		return
	}
	postIDStr := matches[1]

	// Получаем глобальный токен админа для чтения публичных постов
	adminToken, err := getActiveVKToken()
	if err != nil || adminToken == "" {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Admin VK token not found"})
		return
	}

	client := vk.NewVKClient(adminToken)
	resp, err := client.WallGetById(postIDStr, true)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": fmt.Sprintf("VK API Error: %v", err)})
		return
	}

	if len(resp.Items) == 0 {
		respondJSON(w, http.StatusNotFound, map[string]string{"error": "Post not found or access denied"})
		return
	}

	post := resp.Items[0]

	// Определяем название автора (группы или пользователя)
	var authorName string
	if post.OwnerID < 0 {
		// Группа
		groupID := -post.OwnerID
		for _, group := range resp.Groups {
			if group.ID == groupID || group.ID == -groupID {
				authorName = group.Name
				break
			}
		}
	} else {
		// Пользователь
		for _, profile := range resp.Profiles {
			if profile.ID == post.OwnerID {
				authorName = profile.FirstName + " " + profile.LastName
				break
			}
		}
	}

	if authorName == "" {
		authorName = "Источник"
	}

	// Формируем текст с источником (формат: источник: [wall-165434330_16254|Название группы])
	sourceStr := fmt.Sprintf("\n\nисточник: [wall%s|%s]", postIDStr, authorName)
	newText := post.Text + sourceStr

	// Формируем список вложений (photo-123_456)
	var attachmentIDs []string
	var previewURLs []map[string]interface{}

	for _, att := range post.Attachments {
		if att.Type == "photo" && att.Photo != nil {
			attachmentIDs = append(attachmentIDs, fmt.Sprintf("photo%d_%d", att.Photo.OwnerID, att.Photo.ID))
			
			// Находим лучшую миниатюру
			var bestURL string
			var bestWidth int
			for _, size := range att.Photo.Sizes {
				if size.Width > bestWidth {
					bestWidth = size.Width
					bestURL = size.URL
				}
			}
			previewURLs = append(previewURLs, map[string]interface{}{
				"type": "photo",
				"url":  bestURL,
			})
		} else if att.Type == "video" && att.Video != nil {
			attachmentIDs = append(attachmentIDs, fmt.Sprintf("video%d_%d", att.Video.OwnerID, att.Video.ID))
			previewURLs = append(previewURLs, map[string]interface{}{
				"type": "video",
				"url":  fmt.Sprintf("https://vk.com/video%d_%d", att.Video.OwnerID, att.Video.ID),
			})
		}
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"post": map[string]interface{}{
			"text":        newText,
			"attachments": strings.Join(attachmentIDs, ","),
			"preview":     previewURLs,
		},
	})
}

// appPublishPostByLinkHandler публикует пост от имени группы
func appPublishPostByLinkHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}

	vkCtx, err := parseLaunchContext(r)
	if err != nil || vkCtx.GroupID == 0 {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": "Not running in group context"})
		return
	}

	var req struct {
		Message     string `json:"message"`
		Attachments string `json:"attachments"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid JSON payload"})
		return
	}

	// Для публикации на стену группы требуется пользовательский токен администратора.
	// Токен группы (community access token) не имеет прав на вызов wall.post.
	adminToken, err := getActiveVKToken()
	if err != nil || adminToken == "" {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Could not find admin token to publish post"})
		return
	}

	groupIDStr := fmt.Sprintf("%v", vkCtx.GroupID)
	client := vk.NewVKClient(adminToken)
	
	var atts []string
	if req.Attachments != "" {
		atts = strings.Split(req.Attachments, ",")
	}

	postID, err := client.WallPost("-"+groupIDStr, req.Message, atts, true, 0)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": fmt.Sprintf("Failed to publish: %v", err)})
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"post_id": postID,
	})
}

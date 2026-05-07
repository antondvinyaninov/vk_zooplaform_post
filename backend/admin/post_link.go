package admin

import (
	"backend/vk"
	"fmt"
	"net/http"
	"regexp"
	"strings"
)

// vkPostByLinkPreviewHandler получает ссылку на пост ВКонтакте и возвращает текст с медиа
func vkPostByLinkPreviewHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}

	link := r.URL.Query().Get("link")
	if link == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Link is required"})
		return
	}

	// Извлекаем wall-123_456 из ссылки
	re := regexp.MustCompile(`wall(-?\d+_\d+)`)
	matches := re.FindStringSubmatch(link)
	if len(matches) < 2 {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid VK post link format"})
		return
	}
	postIDStr := matches[1]

	token, err := getActiveAccountToken()
	if err != nil || token == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "VK account not connected"})
		return
	}

	client := vk.NewVKClient(token)
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

	// Формируем текст с источником
	// источник: [wall-165434330_16254|Название группы]
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
		} else if att.Type == "doc" || att.Type == "audio" {
			// Можно поддержать другие типы, если нужно, но в SMM обычно фото/видео.
			// Как пример: doc123_456
			// Но структура Attachment не имеет doc/audio по умолчанию, нужно добавить в vk.go
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

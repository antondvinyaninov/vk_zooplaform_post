package vk

import (
	"encoding/json"
	"fmt"
)

// AddSnippet добавляет глобальный сниппет для приложения
func (c *VKClient) AddSnippet(title, description, button, imageURL, hash string) (int, error) {
	params := map[string]string{
		"vk_app_id":   "", // Не требуется, если используем сервисный ключ мини-аппа и так
		"title":       title,
		"hash":        hash,
		"image_url":   imageURL,
		"button":      button,
		"description": description,
	}

	resp, err := c.CallMethod("apps.addSnippet", params)
	if err != nil {
		return 0, err
	}

	var res struct {
		SnippetID int `json:"snippet_id"`
	}
	
	// API может вернуть просто snippet_id, а если ошибка, это будет обработано в CallMethod
	if err := json.Unmarshal(resp, &res); err != nil {
		// Возможно, формат ответа другой, например просто ID
		// Иногда ВК возвращает просто число
		var snippetID int
		if err2 := json.Unmarshal(resp, &snippetID); err2 == nil {
			return snippetID, nil
		}
		return 0, fmt.Errorf("failed to parse snippet response: %v, raw: %s", err, string(resp))
	}

	return res.SnippetID, nil
}

package vkapp

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"backend/config"
	"backend/database"
	"backend/utils"
	"backend/vk"
)

// CallbackEvent - базовая структура входящего события
type CallbackEvent struct {
	Type    string          `json:"type"`
	EventID string          `json:"event_id"`
	V       string          `json:"v"`
	Object  json.RawMessage `json:"object"`
	GroupID int             `json:"group_id"`
	Secret  string          `json:"secret"`
}

func callbackHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.RespondError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid body")
		return
	}

	var event CallbackEvent
	if err := json.Unmarshal(body, &event); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "invalid json")
		return
	}

	// 1. Подтверждение сервера (confirmation)
	if event.Type == "confirmation" {
		group, err := getGroupByVKGroupID(event.GroupID)
		if err != nil || group == nil || group.AccessToken == "" {
			http.Error(w, "Group not found or token missing", http.StatusBadRequest)
			return
		}

		client := vk.NewVKClient(group.AccessToken)
		code, err := client.GetCallbackConfirmationCode(event.GroupID)
		if err != nil {
			http.Error(w, "Failed to get code: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "text/plain")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(code))
		return
	}

	// Отвечаем ВК, что событие принято (чтобы он не присылал его повторно)
	w.Header().Set("Content-Type", "text/plain")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("ok"))

	// Асинхронно обрабатываем событие, чтобы не задерживать ВК
	go processCallbackEvent(event)
}

func processCallbackEvent(event CallbackEvent) {
	switch event.Type {
	case "wall_reply_new":
		handleWallReplyNew(event)
	case "message_new":
		handleMessageNew(event)
	}
}

func handleWallReplyNew(event CallbackEvent) {
	var reply struct {
		PostID int    `json:"post_id"`
		Text   string `json:"text"`
	}
	if err := json.Unmarshal(event.Object, &reply); err != nil {
		return
	}

	// Находим пост в нашей БД по vk_post_id
	var userID int
	err := database.QueryRow(`
		SELECT user_id FROM posts 
		WHERE vk_post_id = ? AND group_id = (SELECT id FROM groups WHERE vk_group_id = ?)
	`, reply.PostID, event.GroupID).Scan(&userID)
	
	if err != nil || userID == 0 {
		return // Пост не найден или не принадлежит нашему приложению
	}

	// Получаем VK ID автора
	var vkUserID int
	err = database.QueryRow("SELECT vk_user_id FROM users WHERE id = ?", userID).Scan(&vkUserID)
	if err != nil || vkUserID == 0 {
		return
	}

	message := fmt.Sprintf("К вашему посту появился новый комментарий:\n«%s»", truncateString(reply.Text, 100))
	sendNotificationToUser(vkUserID, message)
}

func handleMessageNew(event CallbackEvent) {
	var msg struct {
		Message struct {
			FromID int    `json:"from_id"`
			Text   string `json:"text"`
		} `json:"message"`
	}
	if err := json.Unmarshal(event.Object, &msg); err != nil {
		return
	}

	vkUserID := msg.Message.FromID
	text := strings.ToLower(strings.TrimSpace(msg.Message.Text))

	// Игнорируем команды или сообщения от самого сообщества
	if vkUserID < 0 {
		return
	}

	// Очень простая заглушка бота
	if text == "привет" || text == "начать" {
		group, _ := getGroupByVKGroupID(event.GroupID)
		groupName := "нашей группы"
		if group != nil {
			groupName = group.Name
		}
		
		reply := fmt.Sprintf("Здравствуйте! Это автоматический бот %s. Если у вас есть вопрос к модераторам, напишите его сюда, и мы ответим вам при первой возможности.", groupName)
		
		var client *vk.VKClient
		if group != nil && group.AccessToken != "" {
			client = vk.NewVKClient(group.AccessToken)
		} else {
			// fallback к официальной группе
			token := config.Load().VKOfficialGroupToken
			if token != "" {
				client = vk.NewVKClient(token)
			}
		}

		if client != nil {
			_ = client.SendDirectMessage(vkUserID, reply)
		}
	}
}

func truncateString(s string, maxLen int) string {
	if len([]rune(s)) > maxLen {
		return string([]rune(s)[:maxLen]) + "..."
	}
	return s
}


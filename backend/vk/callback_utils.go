package vk

import (
	"fmt"
	"backend/config"
	"backend/models"
)

// EnsureCallbackServer проверяет и регистрирует наш сервер в VK Callback API
func EnsureCallbackServer(group *models.Group) {
	if group == nil || group.AccessToken == "" {
		return
	}

	// Для production он должен быть доступен снаружи.
	// Нам не нужно регистрировать сервер, если мы работаем на локалхосте (если только не через ngrok)
	serverURL := "https://vk.zooplatforma.ru/api/callback"

	client := NewVKClient(group.AccessToken)
	
	serverID, err := client.AddCallbackServer(group.VKGroupID, serverURL, "ZooPlatforma Webhook")
	if err != nil {
		// Возможно, сервер уже добавлен
		fmt.Printf("AddCallbackServer info for group %d: %v\n", group.VKGroupID, err)
		return
	}

	// Если сервер успешно добавлен, настраиваем подписки
	err = client.SetCallbackSettings(group.VKGroupID, serverID)
	if err != nil {
		fmt.Printf("SetCallbackSettings error for group %d: %v\n", group.VKGroupID, err)
	} else {
		fmt.Printf("Callback API successfully configured for group %d\n", group.VKGroupID)
	}
}

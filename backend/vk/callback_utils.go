package vk

import (
	"fmt"
	"backend/models"
)

// EnsureCallbackServer проверяет и регистрирует наш сервер в VK Callback API
func EnsureCallbackServer(group *models.Group) error {
	if group == nil || group.AccessToken == "" {
		return fmt.Errorf("group token missing")
	}

	// Для production он должен быть доступен снаружи.
	serverURL := "https://vk.zooplatforma.ru/api/callback"

	client := NewVKClient(group.AccessToken)
	
	serverID, err := client.AddCallbackServer(group.VKGroupID, serverURL, "ZooPlatform")
	if err != nil {
		return fmt.Errorf("AddCallbackServer error: %v", err)
	}

	// Если сервер успешно добавлен, настраиваем подписки
	err = client.SetCallbackSettings(group.VKGroupID, serverID)
	if err != nil {
		return fmt.Errorf("SetCallbackSettings error: %v", err)
	}
	
	return nil
}

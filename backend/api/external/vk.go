package external

import (
	"backend/vk"
)

// VKAPIClient обертка для работы с внешним VK API
type VKAPIClient struct {
	client *vk.VKClient
}

// NewVKAPIClient создает новый клиент для VK API
func NewVKAPIClient(accessToken string) *VKAPIClient {
	return &VKAPIClient{
		client: vk.NewVKClient(accessToken),
	}
}

// GetGroups получает список групп пользователя
func (c *VKAPIClient) GetGroups(extended bool, filter string) (*vk.GroupsGetResponse, error) {
	return c.client.GroupsGet(extended, filter)
}

// GetUsers получает информацию о пользователях
func (c *VKAPIClient) GetUsers(userIDs []string, fields []string) ([]vk.User, error) {
	return c.client.UsersGet(userIDs, fields)
}

// PostToWall публикует пост на стене
func (c *VKAPIClient) PostToWall(ownerID, message string, attachments []string, fromGroup bool, publishDate int64) (int, error) {
	return c.client.WallPost(ownerID, message, attachments, fromGroup, publishDate)
}

// GetWallPosts получает посты со стены
func (c *VKAPIClient) GetWallPosts(ownerID string, count, offset int, filter string) (*vk.WallGetResponse, error) {
	return c.client.WallGet(ownerID, count, offset, filter)
}

// Repost делает репост записи
func (c *VKAPIClient) Repost(object, groupID string) (*vk.WallRepostResponse, error) {
	return c.client.WallRepost(object, groupID)
}

// UploadPhoto загружает фото на стену
func (c *VKAPIClient) UploadPhoto(filePath string, groupID string) (string, string, error) {
	return c.client.UploadPhotoToWall(filePath, groupID)
}

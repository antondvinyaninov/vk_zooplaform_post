package vk

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
)

// WallPostResponse ответ на публикацию поста
type WallPostResponse struct {
	PostID int `json:"post_id"`
}

// WallPost публикует пост на стене
func (c *VKClient) WallPost(ownerID, message string, attachments []string, fromGroup bool, publishDate int64) (int, error) {
	params := map[string]string{
		"owner_id": ownerID,
		"message":  message,
	}

	if fromGroup {
		params["from_group"] = "1"
	}

	if len(attachments) > 0 {
		params["attachments"] = strings.Join(attachments, ",")
	}

	if publishDate > 0 {
		params["publish_date"] = strconv.FormatInt(publishDate, 10)
	}

	resp, err := c.CallMethod("wall.post", params)
	if err != nil {
		return 0, err
	}

	var postResp WallPostResponse
	if err := json.Unmarshal(resp, &postResp); err != nil {
		return 0, fmt.Errorf("failed to parse post response: %w", err)
	}

	return postResp.PostID, nil
}

// WallGetResponse ответ на получение постов
type WallGetResponse struct {
	Count int        `json:"count"`
	Items []WallItem `json:"items"`
}

// WallItem элемент стены
type WallItem struct {
	ID          int          `json:"id"`
	FromID      int          `json:"from_id"`
	OwnerID     int          `json:"owner_id"`
	Date        int64        `json:"date"`
	Text        string       `json:"text"`
	Attachments []Attachment `json:"attachments"`
	Comments    *CountInfo   `json:"comments"`
	Likes       *CountInfo   `json:"likes"`
	Reposts     *CountInfo   `json:"reposts"`
	Views       *CountInfo   `json:"views"`
}

// Attachment вложение
type Attachment struct {
	Type  string `json:"type"`
	Photo *Photo `json:"photo,omitempty"`
	Video *Video `json:"video,omitempty"`
}

// Photo фотография
type Photo struct {
	ID      int    `json:"id"`
	OwnerID int    `json:"owner_id"`
	Sizes   []Size `json:"sizes"`
}

// Size размер фото
type Size struct {
	Type   string `json:"type"`
	URL    string `json:"url"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
}

// Video видео
type Video struct {
	ID      int    `json:"id"`
	OwnerID int    `json:"owner_id"`
	Title   string `json:"title"`
}

// CountInfo информация о счетчиках
type CountInfo struct {
	Count int `json:"count"`
}

// WallGet получает посты со стены
func (c *VKClient) WallGet(ownerID string, count, offset int, filter string) (*WallGetResponse, error) {
	params := map[string]string{
		"owner_id": ownerID,
		"count":    strconv.Itoa(count),
		"offset":   strconv.Itoa(offset),
	}

	if filter != "" && filter != "all" {
		params["filter"] = filter
	}

	resp, err := c.CallMethod("wall.get", params)
	if err != nil {
		return nil, err
	}

	var wallResp WallGetResponse
	if err := json.Unmarshal(resp, &wallResp); err != nil {
		return nil, fmt.Errorf("failed to parse wall.get response: %w", err)
	}

	return &wallResp, nil
}

// WallRepostResponse ответ на репост
type WallRepostResponse struct {
	Success      int `json:"success"`
	PostID       int `json:"post_id"`
	RepostsCount int `json:"reposts_count"`
	LikesCount   int `json:"likes_count"`
}

// WallRepost делает репост записи
func (c *VKClient) WallRepost(object, groupID string) (*WallRepostResponse, error) {
	params := map[string]string{
		"object": object,
	}

	if groupID != "" {
		params["group_id"] = groupID
	}

	resp, err := c.CallMethod("wall.repost", params)
	if err != nil {
		return nil, err
	}

	var repostResp WallRepostResponse
	if err := json.Unmarshal(resp, &repostResp); err != nil {
		return nil, fmt.Errorf("failed to parse repost response: %w", err)
	}

	return &repostResp, nil
}

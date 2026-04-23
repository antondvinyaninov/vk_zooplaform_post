package models

import "time"

// Group представляет группу VK
type Group struct {
	ID          int       `json:"id"`
	VKGroupID   int       `json:"vk_group_id"`
	Name        string    `json:"name"`
	ScreenName  string    `json:"screen_name"`
	Photo200    string    `json:"photo_200"`
	AccessToken string    `json:"access_token,omitempty"`
	IsActive    bool      `json:"is_active"`
	HealthStatus string    `json:"health_status"`
	LastCheckAt  time.Time `json:"last_check_at,omitempty"`
	HealthError  string    `json:"health_error,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

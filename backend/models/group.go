package models

import "time"

// Group представляет группу VK
type Group struct {
	ID          int       `json:"id"`
	VKGroupID   int       `json:"vk_group_id"`
	Name        string    `json:"name"`
	ScreenName  string    `json:"screen_name"`
	Photo200     string    `json:"photo_200"`
	CityID       *int      `json:"city_id,omitempty"`
	CityTitle    *string   `json:"city_title,omitempty"`
	AccessToken  string    `json:"access_token,omitempty"`
	IsActive     bool      `json:"is_active"`
	HealthStatus string    `json:"health_status"`
	LastCheckAt  time.Time `json:"last_check_at,omitempty"`
	HealthError  string    `json:"health_error,omitempty"`
	MembersCount int       `json:"members_count"`
	NotifyUserIDs string   `json:"notify_user_ids"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

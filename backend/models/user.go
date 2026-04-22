package models

import "time"

// User представляет пользователя
type User struct {
	ID        int       `json:"id"`
	VKUserID  int       `json:"vk_user_id"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name"`
	Photo200  string    `json:"photo_200"`
	Role      string    `json:"role"` // admin, user
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

package models

// AdminUser представляет пользователя админ-панели
type AdminUser struct {
	ID          int     `json:"id"`
	Username    string  `json:"username"`
	Password    string  `json:"-"`
	DisplayName string  `json:"display_name"`
	Role        string  `json:"role"`
	Status      string  `json:"status"`
	AvatarURL   *string `json:"avatar_url,omitempty"`
	LastLogin   *string `json:"last_login,omitempty"`
	CreatedAt   string  `json:"created_at"`
	UpdatedAt   string  `json:"updated_at"`
}

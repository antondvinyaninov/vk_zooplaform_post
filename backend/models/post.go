package models

import "time"

// PostPublication представляет статус публикации поста в конкретной группе
type PostPublication struct {
	ID            int       `json:"id"`
	PostID        int       `json:"post_id"`
	GroupID       int       `json:"group_id"`
	VKPostID      int       `json:"vk_post_id,omitempty"`
	Status        string    `json:"status"` // pending, scheduled, published, rejected, failed, deleted
	RejectReason  string    `json:"reject_reason,omitempty"`
	DeleteReason  string    `json:"delete_reason,omitempty"`
	DeleteComment string    `json:"delete_comment,omitempty"`
	PublishDate   time.Time `json:"publish_date,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// Post представляет пост (контент)
type Post struct {
	ID           int               `json:"id"`
	UserID       int               `json:"user_id,omitempty"`
	Message      string            `json:"message"`
	Attachments  string            `json:"attachments,omitempty"`
	S3VideoKey   string            `json:"s3_video_key,omitempty"`
	CreatedAt    time.Time         `json:"created_at"`
	UpdatedAt    time.Time         `json:"updated_at"`
	Publications []PostPublication `json:"publications,omitempty"`
}

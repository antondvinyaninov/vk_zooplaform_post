package models

import "time"

// Post представляет пост
type Post struct {
	ID          int       `json:"id"`
	VKPostID    int       `json:"vk_post_id,omitempty"`
	UserID      int       `json:"user_id,omitempty"`
	GroupID     int       `json:"group_id"`
	Message     string    `json:"message"`
	Attachments string    `json:"attachments,omitempty"`
	S3VideoKey  string    `json:"s3_video_key,omitempty"`
	Status      string    `json:"status"` // pending, scheduled, published, rejected, failed
	RejectReason string   `json:"reject_reason,omitempty"`
	PublishDate time.Time `json:"publish_date,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

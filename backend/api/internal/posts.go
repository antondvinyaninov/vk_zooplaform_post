package internal

import (
	"backend/database"
	"backend/models"
	"database/sql"
	"time"
)

// PostService сервис для работы с постами
type PostService struct{}

// NewPostService создает новый сервис постов
func NewPostService() *PostService {
	return &PostService{}
}

// Create создает новый пост в БД
func (s *PostService) Create(post *models.Post) error {
	query := `
		INSERT INTO posts (vk_post_id, user_id, group_id, message, attachments, s3_video_key, status, publish_date)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`
	if err := database.QueryRow(query+` RETURNING id`,
		post.VKPostID,
		post.UserID,
		post.GroupID,
		post.Message,
		post.Attachments,
		post.S3VideoKey,
		post.Status,
		post.PublishDate,
	).Scan(&post.ID); err != nil {
		return err
	}
	post.CreatedAt = time.Now()
	post.UpdatedAt = time.Now()

	return nil
}

// GetByID получает пост по ID
func (s *PostService) GetByID(id int) (*models.Post, error) {
	query := `
		SELECT id, vk_post_id, user_id, group_id, message, attachments, s3_video_key, status, publish_date, created_at, updated_at
		FROM posts
		WHERE id = ?
	`

	post := &models.Post{}
	var userID sql.NullInt64
	var publishDate sql.NullTime

	var s3VideoKey sql.NullString

	err := database.QueryRow(query, id).Scan(
		&post.ID,
		&post.VKPostID,
		&userID,
		&post.GroupID,
		&post.Message,
		&post.Attachments,
		&s3VideoKey,
		&post.Status,
		&publishDate,
		&post.CreatedAt,
		&post.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	if publishDate.Valid {
		post.PublishDate = publishDate.Time
	}
	if userID.Valid {
		post.UserID = int(userID.Int64)
	}
	if s3VideoKey.Valid {
		post.S3VideoKey = s3VideoKey.String
	}

	return post, nil
}

// GetByGroupID получает посты группы
func (s *PostService) GetByGroupID(groupID int, limit, offset int) ([]*models.Post, error) {
	query := `
		SELECT id, vk_post_id, user_id, group_id, message, attachments, s3_video_key, status, publish_date, created_at, updated_at
		FROM posts
		WHERE group_id = ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := database.Query(query, groupID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []*models.Post
	for rows.Next() {
		post := &models.Post{}
		var userID sql.NullInt64
		var publishDate sql.NullTime

		var s3VideoKey sql.NullString

		err := rows.Scan(
			&post.ID,
			&post.VKPostID,
			&userID,
			&post.GroupID,
			&post.Message,
			&post.Attachments,
			&s3VideoKey,
			&post.Status,
			&publishDate,
			&post.CreatedAt,
			&post.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		if publishDate.Valid {
			post.PublishDate = publishDate.Time
		}
		if userID.Valid {
			post.UserID = int(userID.Int64)
		}
		if s3VideoKey.Valid {
			post.S3VideoKey = s3VideoKey.String
		}

		posts = append(posts, post)
	}

	return posts, nil
}

// GetByStatus получает посты по статусу
func (s *PostService) GetByStatus(status string, limit, offset int) ([]*models.Post, error) {
	query := `
		SELECT id, vk_post_id, user_id, group_id, message, attachments, s3_video_key, status, publish_date, created_at, updated_at
		FROM posts
		WHERE status = ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := database.Query(query, status, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []*models.Post
	for rows.Next() {
		post := &models.Post{}
		var userID sql.NullInt64
		var publishDate sql.NullTime

		var s3VideoKey sql.NullString

		err := rows.Scan(
			&post.ID,
			&post.VKPostID,
			&userID,
			&post.GroupID,
			&post.Message,
			&post.Attachments,
			&s3VideoKey,
			&post.Status,
			&publishDate,
			&post.CreatedAt,
			&post.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		if publishDate.Valid {
			post.PublishDate = publishDate.Time
		}
		if userID.Valid {
			post.UserID = int(userID.Int64)
		}
		if s3VideoKey.Valid {
			post.S3VideoKey = s3VideoKey.String
		}

		posts = append(posts, post)
	}

	return posts, nil
}

// GetByUserID получает посты пользователя
func (s *PostService) GetByUserID(userID int, limit, offset int) ([]*models.Post, error) {
	query := `
		SELECT id, vk_post_id, user_id, group_id, message, attachments, s3_video_key, status, publish_date, created_at, updated_at
		FROM posts
		WHERE user_id = ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := database.Query(query, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []*models.Post
	for rows.Next() {
		post := &models.Post{}
		var dbUserID sql.NullInt64
		var publishDate sql.NullTime

		var s3VideoKey sql.NullString

		err := rows.Scan(
			&post.ID,
			&post.VKPostID,
			&dbUserID,
			&post.GroupID,
			&post.Message,
			&post.Attachments,
			&s3VideoKey,
			&post.Status,
			&publishDate,
			&post.CreatedAt,
			&post.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		if dbUserID.Valid {
			post.UserID = int(dbUserID.Int64)
		}
		if publishDate.Valid {
			post.PublishDate = publishDate.Time
		}
		if s3VideoKey.Valid {
			post.S3VideoKey = s3VideoKey.String
		}

		posts = append(posts, post)
	}

	return posts, nil
}

// Update обновляет пост
func (s *PostService) Update(post *models.Post) error {
	query := `
		UPDATE posts
		SET vk_post_id = ?, user_id = ?, group_id = ?, message = ?, attachments = ?, s3_video_key = ?, status = ?, publish_date = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`
	_, err := database.Exec(query,
		post.VKPostID,
		post.UserID,
		post.GroupID,
		post.Message,
		post.Attachments,
		post.S3VideoKey,
		post.Status,
		post.PublishDate,
		post.ID,
	)
	return err
}

// UpdateStatus обновляет статус поста
func (s *PostService) UpdateStatus(id int, status string) error {
	query := `UPDATE posts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
	_, err := database.Exec(query, status, id)
	return err
}

// Delete удаляет пост
func (s *PostService) Delete(id int) error {
	query := `DELETE FROM posts WHERE id = ?`
	_, err := database.Exec(query, id)
	return err
}

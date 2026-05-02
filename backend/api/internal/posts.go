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

// Create создает новый пост в БД (в админке это сейчас редко используется, но обновим)
func (s *PostService) Create(post *models.Post) error {
	tx, err := database.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `
		INSERT INTO posts (user_id, message, attachments, s3_video_key)
		VALUES (?, ?, ?, ?) RETURNING id
	`
	if err := tx.QueryRow(query, post.UserID, post.Message, post.Attachments, post.S3VideoKey).Scan(&post.ID); err != nil {
		return err
	}
	post.CreatedAt = time.Now()
	post.UpdatedAt = time.Now()

	return tx.Commit()
}

func (s *PostService) loadPublications(post *models.Post) error {
	query := `SELECT id, post_id, group_id, vk_post_id, status, reject_reason, delete_reason, delete_comment, publish_date, created_at, updated_at FROM post_publications WHERE post_id = ?`
	rows, err := database.Query(query, post.ID)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var pub models.PostPublication
		var dbVKPostID sql.NullInt64
		var rejectReason, deleteReason, deleteComment sql.NullString
		var publishDate sql.NullTime

		if err := rows.Scan(
			&pub.ID,
			&pub.PostID,
			&pub.GroupID,
			&dbVKPostID,
			&pub.Status,
			&rejectReason,
			&deleteReason,
			&deleteComment,
			&publishDate,
			&pub.CreatedAt,
			&pub.UpdatedAt,
		); err != nil {
			return err
		}

		if dbVKPostID.Valid {
			pub.VKPostID = int(dbVKPostID.Int64)
		}
		if rejectReason.Valid {
			pub.RejectReason = rejectReason.String
		}
		if deleteReason.Valid {
			pub.DeleteReason = deleteReason.String
		}
		if deleteComment.Valid {
			pub.DeleteComment = deleteComment.String
		}
		if publishDate.Valid {
			pub.PublishDate = publishDate.Time
		}

		post.Publications = append(post.Publications, pub)
	}
	return nil
}

// GetByID получает пост по ID
func (s *PostService) GetByID(id int) (*models.Post, error) {
	query := `
		SELECT id, user_id, message, attachments, s3_video_key, created_at, updated_at
		FROM posts
		WHERE id = ?
	`

	post := &models.Post{}
	var userID sql.NullInt64
	var s3VideoKey sql.NullString

	err := database.QueryRow(query, id).Scan(
		&post.ID,
		&userID,
		&post.Message,
		&post.Attachments,
		&s3VideoKey,
		&post.CreatedAt,
		&post.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	if userID.Valid {
		post.UserID = int(userID.Int64)
	}
	if s3VideoKey.Valid {
		post.S3VideoKey = s3VideoKey.String
	}

	if err := s.loadPublications(post); err != nil {
		return nil, err
	}

	return post, nil
}

// GetByGroupID получает посты группы
func (s *PostService) GetByGroupID(groupID int, limit, offset int) ([]*models.Post, error) {
	query := `
		SELECT p.id, p.user_id, p.message, p.attachments, p.s3_video_key, p.created_at, p.updated_at
		FROM posts p
		INNER JOIN post_publications pub ON p.id = pub.post_id
		WHERE pub.group_id = ?
		ORDER BY p.created_at DESC
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
		var s3VideoKey sql.NullString

		err := rows.Scan(
			&post.ID,
			&userID,
			&post.Message,
			&post.Attachments,
			&s3VideoKey,
			&post.CreatedAt,
			&post.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		if userID.Valid {
			post.UserID = int(userID.Int64)
		}
		if s3VideoKey.Valid {
			post.S3VideoKey = s3VideoKey.String
		}

		if err := s.loadPublications(post); err != nil {
			return nil, err
		}

		posts = append(posts, post)
	}

	return posts, nil
}

// GetByStatus получает посты по статусу
func (s *PostService) GetByStatus(status string, limit, offset int) ([]*models.Post, error) {
	query := `
		SELECT p.id, p.user_id, p.message, p.attachments, p.s3_video_key, p.created_at, p.updated_at
		FROM posts p
		INNER JOIN post_publications pub ON p.id = pub.post_id
		WHERE pub.status = ?
		ORDER BY p.created_at DESC
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
		var s3VideoKey sql.NullString

		err := rows.Scan(
			&post.ID,
			&userID,
			&post.Message,
			&post.Attachments,
			&s3VideoKey,
			&post.CreatedAt,
			&post.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		if userID.Valid {
			post.UserID = int(userID.Int64)
		}
		if s3VideoKey.Valid {
			post.S3VideoKey = s3VideoKey.String
		}

		if err := s.loadPublications(post); err != nil {
			return nil, err
		}

		posts = append(posts, post)
	}

	return posts, nil
}

// GetByUserID получает посты пользователя
func (s *PostService) GetByUserID(userID int, limit, offset int) ([]*models.Post, error) {
	query := `
		SELECT id, user_id, message, attachments, s3_video_key, created_at, updated_at
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
		var s3VideoKey sql.NullString

		err := rows.Scan(
			&post.ID,
			&dbUserID,
			&post.Message,
			&post.Attachments,
			&s3VideoKey,
			&post.CreatedAt,
			&post.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		if dbUserID.Valid {
			post.UserID = int(dbUserID.Int64)
		}
		if s3VideoKey.Valid {
			post.S3VideoKey = s3VideoKey.String
		}

		if err := s.loadPublications(post); err != nil {
			return nil, err
		}

		posts = append(posts, post)
	}

	return posts, nil
}

// Update обновляет пост
func (s *PostService) Update(post *models.Post) error {
	query := `
		UPDATE posts
		SET message = ?, attachments = ?, s3_video_key = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`
	_, err := database.Exec(query,
		post.Message,
		post.Attachments,
		post.S3VideoKey,
		post.ID,
	)
	return err
}

// UpdateStatus обновляет статус поста во всех публикациях (админка делает массово)
func (s *PostService) UpdateStatus(id int, status string) error {
	query := `UPDATE post_publications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE post_id = ?`
	_, err := database.Exec(query, status, id)
	return err
}

// Delete удаляет пост
func (s *PostService) Delete(id int) error {
	query := `DELETE FROM posts WHERE id = ?`
	_, err := database.Exec(query, id)
	return err
}

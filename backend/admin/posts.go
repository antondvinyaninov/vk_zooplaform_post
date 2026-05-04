package admin

import (
	"backend/database"
	"backend/utils"
	"database/sql"
	"net/http"
	"strconv"
	"time"
)

type adminPostGroup struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Photo200 string `json:"photo_200"`
}

type adminPost struct {
	ID           int             `json:"id"`
	Message      string          `json:"message"`
	Status       string          `json:"status"`
	Attachments  string          `json:"attachments,omitempty"`
	PublishDate  *string         `json:"publish_date,omitempty"`
	CreatedAt    string          `json:"created_at"`
	Group        *adminPostGroup `json:"group,omitempty"`
}

func adminPostsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.RespondError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 50
	offset := 0

	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 500 {
		limit = l
	}
	if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
		offset = o
	}

	query := `
		SELECT 
			p.id, p.message, p.attachments, p.created_at,
			pub.status, pub.publish_date,
			g.id, g.name, g.photo_200
		FROM posts p
		INNER JOIN post_publications pub ON p.id = pub.post_id
		INNER JOIN groups g ON pub.group_id = g.id
		ORDER BY p.created_at DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := database.DB.Query(query, limit, offset)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "failed to query posts")
		return
	}
	defer rows.Close()

	var posts []adminPost
	for rows.Next() {
		var post adminPost
		var group adminPostGroup
		var attachments sql.NullString
		var publishDate sql.NullTime
		var createdAt time.Time

		err := rows.Scan(
			&post.ID,
			&post.Message,
			&attachments,
			&createdAt,
			&post.Status,
			&publishDate,
			&group.ID,
			&group.Name,
			&group.Photo200,
		)
		if err != nil {
			utils.RespondError(w, http.StatusInternalServerError, "failed to scan post")
			return
		}

		if attachments.Valid {
			post.Attachments = attachments.String
		}
		if publishDate.Valid {
			pd := publishDate.Time.Format(time.RFC3339)
			post.PublishDate = &pd
		}
		post.CreatedAt = createdAt.Format(time.RFC3339)
		post.Group = &group

		posts = append(posts, post)
	}

	if posts == nil {
		posts = []adminPost{}
	}

	utils.RespondSuccess(w, posts)
}

package admin

import (
	"backend/database"
	"backend/models"
	"backend/utils"
	"database/sql"
	"net/http"
	"strconv"
)

func logsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.RespondError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	// Parsing query parameters for pagination and filtering
	levelFilter := r.URL.Query().Get("level")
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
		SELECT id, level, action, message, user_id, details, created_at
		FROM system_logs
	`
	var args []interface{}
	
	if levelFilter != "" && levelFilter != "ALL" {
		query += ` WHERE level = ?`
		args = append(args, levelFilter)
	}

	query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`
	args = append(args, limit, offset)

	rows, err := database.Query(query, args...)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	var logs []models.SystemLog
	for rows.Next() {
		var l models.SystemLog
		var userID sql.NullInt64
		var details sql.NullString

		if err := rows.Scan(&l.ID, &l.Level, &l.Action, &l.Message, &userID, &details, &l.CreatedAt); err != nil {
			utils.RespondError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if userID.Valid {
			uid := int(userID.Int64)
			l.UserID = &uid
		}
		if details.Valid {
			l.Details = details.String
		}
		logs = append(logs, l)
	}

	utils.RespondSuccess(w, logs)
}

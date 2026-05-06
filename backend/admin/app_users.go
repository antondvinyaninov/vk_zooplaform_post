package admin

import (
	"backend/config"
	"backend/database"
	"backend/models"
	"backend/utils"
	"backend/vk"
	"database/sql"
	"log"
	"net/http"
	"strconv"
)

func appUsersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.RespondError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")
	search := r.URL.Query().Get("search")

	limit := 50
	offset := 0

	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 500 {
		limit = l
	}
	if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
		offset = o
	}

	query := `
		SELECT id, vk_user_id, first_name, last_name, photo_200, city_id, city_title, role, created_at, updated_at
		FROM users
	`
	var args []interface{}

	if search != "" {
		query += ` WHERE first_name ILIKE ? OR last_name ILIKE ?`
		args = append(args, "%"+search+"%", "%"+search+"%")
	}

	query += ` ORDER BY updated_at DESC LIMIT ? OFFSET ?`
	args = append(args, limit, offset)

	rows, err := database.Query(query, args...)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "Failed to query database: "+err.Error())
		return
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		var firstName, lastName, photo200, cityTitle, role sql.NullString
		var cityID sql.NullInt64

		if err := rows.Scan(
			&u.ID, &u.VKUserID, &firstName, &lastName, &photo200, &cityID, &cityTitle, &role, &u.CreatedAt, &u.UpdatedAt,
		); err != nil {
			utils.RespondError(w, http.StatusInternalServerError, "Failed to scan row: "+err.Error())
			return
		}

		if firstName.Valid {
			u.FirstName = firstName.String
		}
		if lastName.Valid {
			u.LastName = lastName.String
		}
		if photo200.Valid {
			u.Photo200 = photo200.String
		}
		if cityTitle.Valid {
			u.CityTitle = &cityTitle.String
		}
		if cityID.Valid {
			cid := int(cityID.Int64)
			u.CityID = &cid
		}
		if role.Valid {
			u.Role = role.String
		}

		users = append(users, u)
	}

	countQuery := `SELECT COUNT(*) FROM users`
	var countArgs []interface{}
	if search != "" {
		countQuery += ` WHERE first_name ILIKE ? OR last_name ILIKE ?`
		countArgs = append(countArgs, "%"+search+"%", "%"+search+"%")
	}

	var total int
	if err := database.QueryRow(countQuery, countArgs...).Scan(&total); err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "Failed to count users: "+err.Error())
		return
	}

	// Отдаём пустой массив вместо null
	if users == nil {
		users = []models.User{}
	} else {
		var userIDs []int
		for _, u := range users {
			userIDs = append(userIDs, u.VKUserID)
		}

		cfg := config.Load()
		if cfg.VKOfficialGroupToken != "" {
			client := vk.NewVKClient(cfg.VKOfficialGroupToken)
			allowedMap, err := client.CheckMessagesAllowed(165434330, userIDs)
			if err == nil {
				for i := range users {
					allowed := allowedMap[users[i].VKUserID]
					users[i].IsMessagesAllowed = &allowed
				}
			} else {
				log.Printf("Error checking messages allowed: %v", err)
			}
		}
	}

	utils.RespondSuccess(w, map[string]interface{}{
		"users": users,
		"total": total,
	})
}

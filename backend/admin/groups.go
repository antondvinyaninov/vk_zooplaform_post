package admin

import (
	"backend/database"
	"backend/models"
	"backend/vk"
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type installedGroupResponse struct {
	ID           int     `json:"id"`
	VKGroupID    int     `json:"vk_group_id"`
	Name         string  `json:"name"`
	ScreenName   string  `json:"screen_name"`
	Photo200     string  `json:"photo_200"`
	IsActive     bool    `json:"is_active"`
	HealthStatus string  `json:"health_status"`
	LastCheckAt  *string `json:"last_check_at,omitempty"`
	HealthError  string  `json:"health_error,omitempty"`
}

func installedGroupsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}

	groups, err := listInstalledGroups()
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to load groups"})
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"groups": groups,
	})
}

func refreshGroupHealthHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}

	var req struct {
		GroupID int `json:"group_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil && err.Error() != "EOF" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid JSON"})
		return
	}

	updated, err := refreshGroupsHealth(req.GroupID)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"updated": updated,
	})
}

func listInstalledGroups() ([]installedGroupResponse, error) {
	rows, err := database.Query(`
		SELECT id, vk_group_id, name, screen_name, photo_200, access_token, is_active, health_status, last_check_at, health_error
		FROM groups
		WHERE is_active = ?
		ORDER BY updated_at DESC
	`, true)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]installedGroupResponse, 0)
	for rows.Next() {
		group, _, err := scanInstalledGroup(rows)
		if err != nil {
			return nil, err
		}

		item := installedGroupResponse{
			ID:           group.ID,
			VKGroupID:    group.VKGroupID,
			Name:         group.Name,
			ScreenName:   group.ScreenName,
			Photo200:     group.Photo200,
			IsActive:     group.IsActive,
			HealthStatus: normalizeHealthStatus(group.HealthStatus),
			HealthError:  strings.TrimSpace(group.HealthError),
		}
		if !group.LastCheckAt.IsZero() {
			ts := group.LastCheckAt.Format(time.RFC3339)
			item.LastCheckAt = &ts
		}
		result = append(result, item)
	}

	return result, rows.Err()
}

func scanInstalledGroup(scanner interface {
	Scan(dest ...interface{}) error
}) (*models.Group, string, error) {
	var (
		group          models.Group
		accessToken    sql.NullString
		healthStatus   sql.NullString
		lastCheckAt    sql.NullTime
		healthErrorRaw sql.NullString
	)

	err := scanner.Scan(
		&group.ID,
		&group.VKGroupID,
		&group.Name,
		&group.ScreenName,
		&group.Photo200,
		&accessToken,
		&group.IsActive,
		&healthStatus,
		&lastCheckAt,
		&healthErrorRaw,
	)
	if err != nil {
		return nil, "", err
	}

	token := ""
	if accessToken.Valid {
		token = accessToken.String
	}
	if healthStatus.Valid {
		group.HealthStatus = healthStatus.String
	}
	if lastCheckAt.Valid {
		group.LastCheckAt = lastCheckAt.Time
	}
	if healthErrorRaw.Valid {
		group.HealthError = healthErrorRaw.String
	}

	return &group, token, nil
}

func normalizeHealthStatus(status string) string {
	status = strings.TrimSpace(strings.ToLower(status))
	switch status {
	case "ok", "error", "unknown":
		return status
	default:
		return "unknown"
	}
}

func refreshGroupsHealth(groupID int) (int, error) {
	query := `
		SELECT id, vk_group_id
		FROM groups
		WHERE is_active = ?
	`
	args := []interface{}{true}
	if groupID > 0 {
		query += " AND id = ?"
		args = append(args, groupID)
	}

	rows, err := database.Query(query, args...)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	// Получаем токен админа один раз
	var adminToken string
	dbErr := database.QueryRow(`
		SELECT access_token
		FROM vk_accounts
		WHERE is_active = ?
		ORDER BY updated_at DESC LIMIT 1
	`, true).Scan(&adminToken)
	if dbErr != nil {
		adminToken = ""
	}

	updated := 0
	for rows.Next() {
		var (
			id         int
			vkGroupID  int
		)
		if err := rows.Scan(&id, &vkGroupID); err != nil {
			return updated, err
		}

		status := "error"
		errText := "admin VK token is not connected"
		if adminToken != "" {
			client := vk.NewVKClient(adminToken)
			_, checkErr := client.CallMethod("wall.get", map[string]string{
				"owner_id": "-" + strconv.Itoa(vkGroupID),
				"count":    "1",
			})
			if checkErr == nil {
				status = "ok"
				errText = ""
			} else {
				errText = checkErr.Error()
			}
		}

		if _, err := database.Exec(`
			UPDATE groups
			SET health_status = ?, last_check_at = CURRENT_TIMESTAMP, health_error = ?, updated_at = CURRENT_TIMESTAMP
			WHERE id = ?
		`, status, errText, id); err != nil {
			return updated, err
		}
		updated++
	}

	if err := rows.Err(); err != nil {
		return updated, err
	}
	return updated, nil
}

package admin

import (
	"backend/database"
	"backend/models"
	"database/sql"
	"net/http"
	"strings"
)

type installedGroupResponse struct {
	ID         int    `json:"id"`
	VKGroupID  int    `json:"vk_group_id"`
	Name       string `json:"name"`
	ScreenName string `json:"screen_name"`
	Photo200   string `json:"photo_200"`
	IsActive   bool   `json:"is_active"`
	HasToken   bool   `json:"has_token"`
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

func listInstalledGroups() ([]installedGroupResponse, error) {
	rows, err := database.DB.Query(`
		SELECT id, vk_group_id, name, screen_name, photo_200, access_token, is_active
		FROM groups
		WHERE is_active = 1
		ORDER BY updated_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]installedGroupResponse, 0)
	for rows.Next() {
		group, accessToken, err := scanInstalledGroup(rows)
		if err != nil {
			return nil, err
		}

		item := installedGroupResponse{
			ID:         group.ID,
			VKGroupID:  group.VKGroupID,
			Name:       group.Name,
			ScreenName: group.ScreenName,
			Photo200:   group.Photo200,
			IsActive:   group.IsActive,
			HasToken:   strings.TrimSpace(accessToken) != "",
		}
		result = append(result, item)
	}

	return result, rows.Err()
}

func scanInstalledGroup(scanner interface {
	Scan(dest ...interface{}) error
}) (*models.Group, string, error) {
	var (
		group       models.Group
		accessToken sql.NullString
	)

	err := scanner.Scan(
		&group.ID,
		&group.VKGroupID,
		&group.Name,
		&group.ScreenName,
		&group.Photo200,
		&accessToken,
		&group.IsActive,
	)
	if err != nil {
		return nil, "", err
	}

	token := ""
	if accessToken.Valid {
		token = accessToken.String
	}

	return &group, token, nil
}

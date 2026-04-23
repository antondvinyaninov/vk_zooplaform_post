package admin

import (
	"backend/database"
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

type vkAccount struct {
	ID           int    `json:"id"`
	VKUserID     int    `json:"vk_user_id,omitempty"`
	UserName     string `json:"user_name,omitempty"`
	UserPhoto    string `json:"user_photo,omitempty"`
	HasToken     bool   `json:"has_token"`
	TokenExpires int64  `json:"token_expires,omitempty"`
	IsActive     bool   `json:"is_active"`
	UpdatedAt    string `json:"updated_at,omitempty"`
	AccessToken  string `json:"access_token,omitempty"`
}

type vkConnectionsResponse struct {
	IsConnected     bool        `json:"is_connected"`
	HasToken        bool        `json:"has_token"`
	VKUserID        int         `json:"vk_user_id,omitempty"`
	UserName        string      `json:"user_name,omitempty"`
	UserPhoto       string      `json:"user_photo,omitempty"`
	TokenExpires    int64       `json:"token_expires,omitempty"`
	UpdatedAt       string      `json:"updated_at,omitempty"`
	ActiveAccount   *vkAccount  `json:"active_account,omitempty"`
	ActiveAccountID int         `json:"active_account_id,omitempty"`
	Accounts        []vkAccount `json:"accounts"`
}

func vkConnectionHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		getVKConnectionsHandler(w)
	case http.MethodPost:
		saveVKAccountHandler(w, r)
	case http.MethodPatch:
		activateVKAccountHandler(w, r)
	case http.MethodDelete:
		deleteVKAccountHandler(w, r)
	default:
		respondJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
	}
}

func getVKConnectionsHandler(w http.ResponseWriter) {
	conn, err := loadVKConnections()
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to load VK connections"})
		return
	}

	respondJSON(w, http.StatusOK, conn)
}

func saveVKAccountHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		AccessToken  string `json:"access_token"`
		VKUserID     int    `json:"vk_user_id"`
		UserName     string `json:"user_name"`
		UserPhoto    string `json:"user_photo"`
		TokenExpires int64  `json:"token_expires"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid JSON"})
		return
	}

	req.AccessToken = strings.TrimSpace(req.AccessToken)
	req.UserName = strings.TrimSpace(req.UserName)
	req.UserPhoto = strings.TrimSpace(req.UserPhoto)

	if req.AccessToken == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "access_token is required"})
		return
	}

	if err := upsertVKAccount(req.AccessToken, req.VKUserID, req.UserName, req.UserPhoto, req.TokenExpires); err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to save VK account"})
		return
	}

	conn, err := loadVKConnections()
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to load VK connections"})
		return
	}

	respondJSON(w, http.StatusOK, conn)
}

func activateVKAccountHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		AccountID int `json:"account_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid JSON"})
		return
	}
	if req.AccountID == 0 {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "account_id is required"})
		return
	}

	if err := setActiveVKAccount(req.AccountID); err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to activate VK account"})
		return
	}

	conn, err := loadVKConnections()
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to load VK connections"})
		return
	}

	respondJSON(w, http.StatusOK, conn)
}

func deleteVKAccountHandler(w http.ResponseWriter, r *http.Request) {
	accountID, err := parseAccountID(r)
	if err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	if err := removeVKAccount(accountID); err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to delete VK account"})
		return
	}

	conn, err := loadVKConnections()
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to load VK connections"})
		return
	}

	respondJSON(w, http.StatusOK, conn)
}

func parseAccountID(r *http.Request) (int, error) {
	rawID := strings.TrimSpace(r.URL.Query().Get("account_id"))
	if rawID == "" {
		return 0, errString("account_id is required")
	}
	accountID, err := strconv.Atoi(rawID)
	if err != nil || accountID <= 0 {
		return 0, errString("invalid account_id")
	}
	return accountID, nil
}

type stringError string

func (e stringError) Error() string { return string(e) }

func errString(v string) error { return stringError(v) }

func upsertVKAccount(accessToken string, vkUserID int, userName, userPhoto string, tokenExpires int64) error {
	tx, err := database.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(database.Rebind(`UPDATE vk_accounts SET is_active = ?`), false); err != nil {
		return err
	}

	updated := false
	if vkUserID != 0 {
		result, err := tx.Exec(database.Rebind(`
			UPDATE vk_accounts
			SET access_token = ?,
			    user_name = ?,
			    user_photo = ?,
			    token_expires = ?,
			    is_active = ?,
			    updated_at = CURRENT_TIMESTAMP
			WHERE vk_user_id = ?
		`), accessToken, userName, userPhoto, nullInt64(tokenExpires), true, vkUserID)
		if err != nil {
			return err
		}
		rows, _ := result.RowsAffected()
		updated = rows > 0
	}

	if !updated {
		if _, err := tx.Exec(database.Rebind(`
			INSERT INTO vk_accounts (vk_user_id, user_name, user_photo, access_token, token_expires, is_active, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
		`), nullInt(vkUserID), userName, userPhoto, accessToken, nullInt64(tokenExpires), true); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func setActiveVKAccount(accountID int) error {
	tx, err := database.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(database.Rebind(`UPDATE vk_accounts SET is_active = ?`), false); err != nil {
		return err
	}
	if _, err := tx.Exec(database.Rebind(`
		UPDATE vk_accounts
		SET is_active = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`), true, accountID); err != nil {
		return err
	}

	return tx.Commit()
}

func removeVKAccount(accountID int) error {
	tx, err := database.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var wasActive sql.NullBool
	if err := tx.QueryRow(database.Rebind(`SELECT is_active FROM vk_accounts WHERE id = ?`), accountID).Scan(&wasActive); err != nil {
		if err == sql.ErrNoRows {
			return nil
		}
		return err
	}

	if _, err := tx.Exec(database.Rebind(`DELETE FROM vk_accounts WHERE id = ?`), accountID); err != nil {
		return err
	}

	if wasActive.Valid && wasActive.Bool {
		if _, err := tx.Exec(database.Rebind(`
			UPDATE vk_accounts
			SET is_active = ?, updated_at = CURRENT_TIMESTAMP
			WHERE id = (
				SELECT id
				FROM vk_accounts
				ORDER BY updated_at DESC, id DESC
				LIMIT 1
			)
		`), true); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func loadVKConnections() (*vkConnectionsResponse, error) {
	rows, err := database.Query(`
		SELECT id, vk_user_id, user_name, user_photo, access_token, token_expires, is_active, updated_at
		FROM vk_accounts
		ORDER BY is_active DESC, updated_at DESC, id DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	accounts := make([]vkAccount, 0)
	var active *vkAccount

	for rows.Next() {
		var (
			item         vkAccount
			vkUserID     sql.NullInt64
			userName     sql.NullString
			userPhoto    sql.NullString
			accessToken  sql.NullString
			tokenExpires sql.NullInt64
			isActive     sql.NullBool
			updatedAt    sql.NullString
		)

		if err := rows.Scan(
			&item.ID,
			&vkUserID,
			&userName,
			&userPhoto,
			&accessToken,
			&tokenExpires,
			&isActive,
			&updatedAt,
		); err != nil {
			return nil, err
		}

		if vkUserID.Valid {
			item.VKUserID = int(vkUserID.Int64)
		}
		if userName.Valid {
			item.UserName = userName.String
		}
		if userPhoto.Valid {
			item.UserPhoto = userPhoto.String
		}
		if tokenExpires.Valid {
			item.TokenExpires = tokenExpires.Int64
		}
		if updatedAt.Valid {
			item.UpdatedAt = updatedAt.String
		}
		item.IsActive = isActive.Valid && isActive.Bool
		item.HasToken = accessToken.Valid && strings.TrimSpace(accessToken.String) != ""
		if item.IsActive {
			item.AccessToken = accessToken.String
		}

		accounts = append(accounts, item)
		if item.IsActive {
			copyItem := item
			active = &copyItem
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	resp := &vkConnectionsResponse{
		Accounts: accounts,
	}

	if active != nil {
		resp.ActiveAccount = active
		resp.ActiveAccountID = active.ID
		resp.IsConnected = active.HasToken
		resp.HasToken = active.HasToken
		resp.VKUserID = active.VKUserID
		resp.UserName = active.UserName
		resp.UserPhoto = active.UserPhoto
		resp.TokenExpires = active.TokenExpires
		resp.UpdatedAt = active.UpdatedAt
	}

	return resp, nil
}

func nullInt(v int) interface{} {
	if v == 0 {
		return nil
	}
	return v
}

func nullInt64(v int64) interface{} {
	if v == 0 {
		return nil
	}
	return v
}

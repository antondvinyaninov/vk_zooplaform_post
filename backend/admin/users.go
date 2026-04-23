package admin

import (
	"backend/database"
	"backend/models"
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

func loginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}

	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid JSON"})
		return
	}

	req.Username = strings.TrimSpace(req.Username)
	req.Password = strings.TrimSpace(req.Password)
	if req.Username == "" || req.Password == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Username and password are required"})
		return
	}

	user, err := getAdminUserByCredentials(req.Username, req.Password)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to authenticate user"})
		return
	}

	if user == nil {
		respondJSON(w, http.StatusUnauthorized, map[string]string{"error": "Invalid username or password"})
		return
	}

	if err := updateAdminUserLastLogin(user.ID); err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to update last login"})
		return
	}

	fresh, err := getAdminUserByID(user.ID)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to fetch user"})
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"user": fresh,
	})
}

func usersHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		users, err := listAdminUsers()
		if err != nil {
			respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to load users"})
			return
		}

		respondJSON(w, http.StatusOK, map[string]interface{}{
			"users": users,
		})
	default:
		respondJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
	}
}

func userByIDHandler(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/admin/users/")
	path = strings.Trim(path, "/")
	if path == "" {
		respondJSON(w, http.StatusNotFound, map[string]string{"error": "Not found"})
		return
	}

	parts := strings.Split(path, "/")
	userID, err := strconv.Atoi(parts[0])
	if err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid user id"})
		return
	}

	if len(parts) == 2 && parts[1] == "role" {
		if r.Method != http.MethodPatch {
			respondJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
			return
		}
		updateUserRoleHandler(w, r, userID)
		return
	}

	respondJSON(w, http.StatusNotFound, map[string]string{"error": "Not found"})
}

func updateUserRoleHandler(w http.ResponseWriter, r *http.Request, userID int) {
	var req struct {
		Role string `json:"role"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid JSON"})
		return
	}

	req.Role = strings.TrimSpace(req.Role)
	if req.Role != "admin" && req.Role != "moderator" && req.Role != "user" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid role"})
		return
	}

	if err := updateAdminUserRole(userID, req.Role); err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to update role"})
		return
	}

	user, err := getAdminUserByID(userID)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to fetch user"})
		return
	}
	if user == nil {
		respondJSON(w, http.StatusNotFound, map[string]string{"error": "User not found"})
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"user": user,
	})
}

func getAdminUserByCredentials(username, password string) (*models.AdminUser, error) {
	query := `
		SELECT id, username, password, display_name, role, status, avatar_url, last_login, created_at, updated_at
		FROM admin_users
		WHERE username = ? AND password = ? AND status = 'active'
		LIMIT 1
	`

	row := database.QueryRow(query, username, password)
	return scanAdminUser(row)
}

func getAdminUserByID(userID int) (*models.AdminUser, error) {
	query := `
		SELECT id, username, password, display_name, role, status, avatar_url, last_login, created_at, updated_at
		FROM admin_users
		WHERE id = ?
	`

	row := database.QueryRow(query, userID)
	return scanAdminUser(row)
}

func listAdminUsers() ([]models.AdminUser, error) {
	query := `
		SELECT id, username, password, display_name, role, status, avatar_url, last_login, created_at, updated_at
		FROM admin_users
		ORDER BY id ASC
	`

	rows, err := database.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.AdminUser
	for rows.Next() {
		user, err := scanAdminUser(rows)
		if err != nil {
			return nil, err
		}
		if user != nil {
			users = append(users, *user)
		}
	}

	return users, rows.Err()
}

func updateAdminUserRole(userID int, role string) error {
	_, err := database.Exec(`
		UPDATE admin_users
		SET role = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, role, userID)
	return err
}

func updateAdminUserLastLogin(userID int) error {
	_, err := database.Exec(`
		UPDATE admin_users
		SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, userID)
	return err
}

type adminUserScanner interface {
	Scan(dest ...interface{}) error
}

func scanAdminUser(scanner adminUserScanner) (*models.AdminUser, error) {
	var (
		user      models.AdminUser
		avatarURL sql.NullString
		lastLogin sql.NullString
	)

	if err := scanner.Scan(
		&user.ID,
		&user.Username,
		&user.Password,
		&user.DisplayName,
		&user.Role,
		&user.Status,
		&avatarURL,
		&lastLogin,
		&user.CreatedAt,
		&user.UpdatedAt,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	if avatarURL.Valid {
		user.AvatarURL = &avatarURL.String
	}

	if lastLogin.Valid {
		user.LastLogin = &lastLogin.String
	}

	user.Password = ""

	return &user, nil
}

package admin

import (
	"backend/config"
	"backend/database"
	"backend/models"
	"backend/vk"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
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
	IsTest       bool    `json:"is_test"`
	HealthStatus string  `json:"health_status"`
	LastCheckAt  *string `json:"last_check_at,omitempty"`
	HealthError  string  `json:"health_error,omitempty"`
	MembersCount int     `json:"members_count"`
	PostsCount   int     `json:"posts_count"` // Количество постов через приложение
}

func installedGroupsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}

	// 1. Получаем все установленные группы из базы
	dbGroups, err := listInstalledGroups()
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to load groups"})
		return
	}

	// 2. Получаем токен пользователя
	token, err := getActiveAccountToken()
	if err != nil || token == "" {
		// Если токена нет, не можем фильтровать. Отдаем пустой список для безопасности.
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"groups": []installedGroupResponse{},
		})
		return
	}

	// 3. Запрашиваем группы пользователя в ВК
	vkClient := vk.NewVKClient(token)
	vkGroups, err := vkClient.GroupsGet(true, "")
	if err != nil {
		// Если ВК упал, отдаем ошибку
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	// 4. Оставляем только те группы, которые есть и в базе, и в ВК
	vkGroupsMap := make(map[int]bool)
	for _, vg := range vkGroups.Items {
		vkGroupsMap[vg.ID] = true
	}

	var filteredGroups []installedGroupResponse
	for _, dg := range dbGroups {
		if vkGroupsMap[dg.VKGroupID] {
			filteredGroups = append(filteredGroups, dg)
		}
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"groups": filteredGroups,
	})
}

func allInstalledGroupsHandler(w http.ResponseWriter, r *http.Request) {
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
		SELECT 
			g.id, 
			g.vk_group_id, 
			g.name, 
			g.screen_name, 
			g.photo_200, 
			g.is_active, 
			g.is_test, 
			g.health_status, 
			g.last_check_at, 
			g.health_error, 
			g.members_count,
			COALESCE(COUNT(DISTINCT pp.id), 0) as posts_count
		FROM groups g
		LEFT JOIN post_publications pp ON pp.group_id = g.id
		WHERE g.is_active = ?
		GROUP BY g.id, g.vk_group_id, g.name, g.screen_name, g.photo_200, g.is_active, g.is_test, g.health_status, g.last_check_at, g.health_error, g.members_count
		ORDER BY g.updated_at DESC
	`, true)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]installedGroupResponse, 0)
	for rows.Next() {
		group, postsCount, err := scanInstalledGroupWithPosts(rows)
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
			IsTest:       group.IsTest,
			HealthStatus: normalizeHealthStatus(group.HealthStatus),
			HealthError:  strings.TrimSpace(group.HealthError),
			MembersCount: group.MembersCount,
			PostsCount:   postsCount,
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
}) (*models.Group, error) {
	var (
		group          models.Group
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
		&group.IsActive,
		&group.IsTest,
		&healthStatus,
		&lastCheckAt,
		&healthErrorRaw,
		&group.MembersCount,
	)
	if err != nil {
		return nil, err
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

	return &group, nil
}

func scanInstalledGroupWithPosts(scanner interface {
	Scan(dest ...interface{}) error
}) (*models.Group, int, error) {
	var (
		group          models.Group
		healthStatus   sql.NullString
		lastCheckAt    sql.NullTime
		healthErrorRaw sql.NullString
		postsCount     int
	)

	err := scanner.Scan(
		&group.ID,
		&group.VKGroupID,
		&group.Name,
		&group.ScreenName,
		&group.Photo200,
		&group.IsActive,
		&group.IsTest,
		&healthStatus,
		&lastCheckAt,
		&healthErrorRaw,
		&group.MembersCount,
		&postsCount,
	)
	if err != nil {
		return nil, 0, err
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

	return &group, postsCount, nil
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
		SELECT id, vk_group_id, access_token, city_id, notify_user_ids
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

	updated := 0
	for rows.Next() {
		var (
			id             int
			vkGroupID      int
			groupTokenRaw  sql.NullString
			cityIDRaw      sql.NullInt64
			notifyUsersRaw sql.NullString
		)
		if err := rows.Scan(&id, &vkGroupID, &groupTokenRaw, &cityIDRaw, &notifyUsersRaw); err != nil {
			return updated, err
		}

		status := "ok"
		var report []string
		membersCount := 0

		groupToken := ""
		if groupTokenRaw.Valid {
			groupToken = groupTokenRaw.String
		}

		// 1. Проверяем токен группы
		if groupToken == "" {
			status = "error"
			report = append(report, "❌ Токен: не подключен")
		} else {
			report = append(report, "✅ Токен: подключен")

			// 2. Проверяем наличие нашего сервера в Callback API
			groupClient := vk.NewVKClient(groupToken)
			servers, checkErr := groupClient.GetCallbackServers(vkGroupID)

			if checkErr != nil {
				status = "error"
				report = append(report, "❌ Вебхук: ошибка API ("+checkErr.Error()+")")
			} else {
				ourServerFound := false
				for _, srv := range servers {
					if strings.Contains(srv.URL, "vk.zooplatforma.ru/api/callback") {
						ourServerFound = true
						if srv.Status != "ok" {
							status = "error"
							report = append(report, "❌ Вебхук: статус сервера '"+srv.Status+"'")
						} else {
							report = append(report, "✅ Вебхук: настроен и работает")
						}
						break
					}
				}

				if !ourServerFound {
					errAdd := vk.EnsureCallbackServer(&models.Group{
						VKGroupID:   vkGroupID,
						AccessToken: groupToken,
					})
					if errAdd != nil {
						status = "error"
						report = append(report, "❌ Вебхук: ошибка автонастройки ("+errAdd.Error()+")")
					} else {
						report = append(report, "✅ Вебхук: добавлен автоматически")
					}
				}
			}
		}

		// 3. Проверяем дополнительные настройки группы
		if !cityIDRaw.Valid || cityIDRaw.Int64 == 0 {
			status = "error"
			report = append(report, "❌ Город: не выбран")
		} else {
			report = append(report, "✅ Город: выбран")
		}

		if !notifyUsersRaw.Valid || notifyUsersRaw.String == "" || notifyUsersRaw.String == "[]" {
			status = "error"
			report = append(report, "❌ Модераторы: не выбраны")
		} else {
			report = append(report, "✅ Модераторы: выбраны")
		}

		errText := strings.Join(report, "\n")

		// Всегда получаем актуальное количество подписчиков через Service Key,
		// чтобы оно отображалось даже если токен группы умер (Ошибка 38 и т.д.)
		cfg := config.Load()
		serviceClient := vk.NewVKClient(cfg.VKServiceKey)
		groupData, errGroups := serviceClient.GroupsGetByID(vkGroupID)
		if errGroups == nil && groupData != nil {
			membersCount = groupData.MembersCount
		}

		if _, err := database.Exec(`
			UPDATE groups
			SET health_status = ?, last_check_at = CURRENT_TIMESTAMP, health_error = ?, members_count = ?, updated_at = CURRENT_TIMESTAMP
			WHERE id = ?
		`, status, errText, membersCount, id); err != nil {
			return updated, err
		}
		updated++
	}

	if err := rows.Err(); err != nil {
		return updated, err
	}

	// Записываем снимок аудитории (total groups и total subscribers) за сегодняшний день
	go saveDailyStatsSnapshot()

	return updated, nil
}

func saveDailyStatsSnapshot() {
	var totalGroups int
	var totalSubscribers int

	// Считаем текущие данные
	err := database.QueryRow(`
		SELECT COUNT(1), COALESCE(SUM(members_count), 0) 
		FROM groups 
		WHERE is_active = ? AND is_test = false
	`, true).Scan(&totalGroups, &totalSubscribers)

	if err != nil {
		log.Printf("[Cron] Error counting stats for snapshot: %v", err)
		return
	}

	today := time.Now().Format("2006-01-02")

	// Сохраняем снимок с конфликтом ON CONFLICT
	_, err = database.Exec(`
		INSERT INTO group_stats_history (date, total_groups, total_subscribers)
		VALUES ($1, $2, $3)
		ON CONFLICT (date) DO UPDATE 
		SET total_groups = EXCLUDED.total_groups, 
			total_subscribers = EXCLUDED.total_subscribers,
			created_at = CURRENT_TIMESTAMP
	`, today, totalGroups, totalSubscribers)

	if err != nil {
		log.Printf("[Cron] Error saving daily stats snapshot: %v", err)
	}
}

// StartHealthCheckCron запускает фоновую проверку статуса всех сообществ раз в 15 минут
func StartHealthCheckCron() {
	go func() {
		ticker := time.NewTicker(15 * time.Minute)
		defer ticker.Stop()

		log.Printf("🔄 [Cron] Starting initial groups health check...")
		if _, err := refreshGroupsHealth(0); err != nil {
			log.Printf("❌ [Cron] Initial health check failed: %v", err)
		} else {
			log.Printf("✅ [Cron] Initial health check completed successfully")
		}

		for range ticker.C {
			log.Printf("🔄 [Cron] Running scheduled groups health check...")
			if _, err := refreshGroupsHealth(0); err != nil {
				log.Printf("❌ [Cron] Scheduled health check failed: %v", err)
			} else {
				log.Printf("✅ [Cron] Scheduled health check completed successfully")
			}
		}
	}()
}

func disconnectGroupHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}

	var req struct {
		GroupID int `json:"group_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid JSON"})
		return
	}

	_, err := database.Exec("UPDATE groups SET is_active = false WHERE id = ?", req.GroupID)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	models.LogInfo("GROUP_DISCONNECTED", "Сообщество отключено от платформы", nil, fmt.Sprintf("Group ID: %d", req.GroupID))

	respondJSON(w, http.StatusOK, map[string]string{"status": "success"})
}

// testGroupPublishHandler публикует тестовый пост ключом сообщества.
// Фото на стену этим ключом VK не принимает (27); пробуем user-токен только на upload.
func testGroupPublishHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}

	var req struct {
		VKGroupID int `json:"vk_group_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.VKGroupID == 0 {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "vk_group_id is required"})
		return
	}

	var (
		name      string
		token     string
		isTest    bool
		groupID   int
		vkGroupID int
	)
	err := database.QueryRow(`
		SELECT id, vk_group_id, name, COALESCE(access_token, ''), is_test
		FROM groups
		WHERE vk_group_id = ?
	`, req.VKGroupID).Scan(&groupID, &vkGroupID, &name, &token, &isTest)
	if err == sql.ErrNoRows {
		respondJSON(w, http.StatusNotFound, map[string]string{"error": "group not found"})
		return
	}
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if !isTest {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": "test publish is allowed only for is_test groups"})
		return
	}
	if strings.TrimSpace(token) == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "group token is empty"})
		return
	}

	tmp, err := os.CreateTemp("", "group_token_test_*.jpg")
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	tmpPath := tmp.Name()
	defer os.Remove(tmpPath)
	if _, err := tmp.Write(minimalJPEG); err != nil {
		tmp.Close()
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	tmp.Close()

	client := vk.NewVKClient(token)
	gid := fmt.Sprintf("%d", vkGroupID)
	att, _, err := vk.UploadPhotoForGroupWall(client, getActiveAccountTokenOrEmpty(), tmpPath, gid)
	if err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "UploadPhotoToWall: " + vk.ExplainWallError(err)})
		return
	}

	postID, err := client.WallPost("-"+gid, "Тест публикации токеном группы ZooPlatforma (можно удалить)", []string{att}, true, 0)
	if err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "wall.post: " + err.Error()})
		return
	}

	models.LogInfo("TEST_GROUP_PUBLISH", "Тестовая публикация токеном сообщества", nil, fmt.Sprintf("Group ID: %d, VK Group ID: %d, VK Post ID: %d", groupID, vkGroupID, postID))
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"ok":         true,
		"group":      name,
		"vk_post_id": postID,
		"url":        fmt.Sprintf("https://vk.com/wall-%d_%d", vkGroupID, postID),
	})
}

// 1x1 JPEG for a one-shot VK upload test.
var minimalJPEG = []byte{
	0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
	0xFF, 0xDB, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C,
	0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12, 0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
	0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29, 0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
	0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00,
	0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B,
	0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0x7B, 0x94, 0x80, 0x01, 0xFF, 0xD9,
}

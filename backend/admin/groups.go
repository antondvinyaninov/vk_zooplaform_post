package admin

import (
	"backend/config"
	"backend/database"
	"backend/models"
	"backend/vk"
	"database/sql"
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/jpeg"
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

	// Источник правды — группы, подключённые через Mini App в БД.
	// Не фильтруем через user-токен /vk-connect: он IP-bound и даёт VK 5,
	// из-за этого админка показывала «Ошибка загрузки групп».
	dbGroups, err := listInstalledGroups()
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to load groups"})
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"groups": dbGroups,
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
	tmp.Close()
	if err := writeZooWallJPEG(tmpPath); err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	gid := fmt.Sprintf("%d", vkGroupID)
	msg := "Проверка картинки ZooPlatforma API (640x360 JPEG). Можно удалить."
	userTokens := listUserPhotoTokens()
	var (
		postID int
		att    string
		err2   error
	)
	// Сначала любые vk_accounts (Mini App / другие), не активный Kate.
	for i, ut := range userTokens {
		postID, att, err2 = vk.WallPostWithPhoto(vk.NewVKClient(ut), ut, "-"+gid, msg, tmpPath)
		if err2 == nil {
			break
		}
		log.Printf("[TEST_GROUP_PUBLISH] stored token %d/%d failed: %v", i+1, len(userTokens), err2)
	}
	if err2 != nil {
		fallback := ""
		if len(userTokens) > 0 {
			fallback = userTokens[0]
		}
		postID, att, err2 = vk.WallPostWithPhoto(vk.NewVKClient(token), fallback, "-"+gid, msg, tmpPath)
	}
	if err2 != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{
			"error":     "VK API: " + vk.ExplainWallError(err2),
			"vk_detail": err2.Error(),
			"tried":     fmt.Sprintf("group_key + %d user tokens", len(userTokens)),
		})
		return
	}

	models.LogInfo("TEST_GROUP_PUBLISH", "Тестовая публикация фото через VK API", nil, fmt.Sprintf("Group ID: %d, VK Group ID: %d, VK Post ID: %d att=%s", groupID, vkGroupID, postID, att))
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"ok":         true,
		"group":      name,
		"vk_post_id": postID,
		"attachment": att,
		"url":        fmt.Sprintf("https://vk.com/wall-%d_%d", vkGroupID, postID),
	})
}

func writeZooWallJPEG(path string) error {
	const w, h = 640, 360
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	green := color.RGBA{22, 140, 72, 255}
	yellow := color.RGBA{255, 210, 0, 255}
	draw.Draw(img, img.Bounds(), &image.Uniform{green}, image.Point{}, draw.Src)
	for x := 0; x < w; x++ {
		for t := 0; t < 10; t++ {
			img.Set(x, t, yellow)
			img.Set(x, h-1-t, yellow)
		}
	}
	for y := 0; y < h; y++ {
		for t := 0; t < 10; t++ {
			img.Set(t, y, yellow)
			img.Set(w-1-t, y, yellow)
		}
	}
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	return jpeg.Encode(f, img, &jpeg.Options{Quality: 90})
}

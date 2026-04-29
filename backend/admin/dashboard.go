package admin

import (
	"backend/database"
	"database/sql"
	"net/http"
	"time"
)

type dailyStat struct {
	Date             string `json:"date"`
	TotalGroups      int    `json:"total_groups"`
	TotalSubscribers int    `json:"total_subscribers"`
}

func dashboardStatsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}

	var totalGroups int
	var totalSubscribers int

	// Текущие данные
	err := database.QueryRow(`
		SELECT COUNT(1), COALESCE(SUM(members_count), 0) 
		FROM groups 
		WHERE is_active = ?
	`, true).Scan(&totalGroups, &totalSubscribers)

	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to load current stats"})
		return
	}

	var groupsOK int
	var groupsError int
	var groupsUnknown int
	var lastGroupCheck sql.NullTime
	err = database.QueryRow(`
		SELECT
			COALESCE(SUM(CASE WHEN health_status = 'ok' THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN health_status = 'error' THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN health_status IS NULL OR health_status = '' OR health_status = 'unknown' THEN 1 ELSE 0 END), 0),
			MAX(last_check_at)
		FROM groups
		WHERE is_active = ?
	`, true).Scan(&groupsOK, &groupsError, &groupsUnknown, &lastGroupCheck)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to load group health stats"})
		return
	}

	// Статистика по предложке (постам) за последние 7 дней
	var postsTotal, postsPending, postsPublished, postsRejected, postsScheduled, postsFailed int

	postsQuery := `
		SELECT
			COUNT(1) as total,
			COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending,
			COALESCE(SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END), 0) as published,
			COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) as rejected,
			COALESCE(SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END), 0) as scheduled,
			COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) as failed
		FROM posts
		WHERE created_at >= NOW() - INTERVAL '7 days'
	`
	database.QueryRow(postsQuery).Scan(&postsTotal, &postsPending, &postsPublished, &postsRejected, &postsScheduled, &postsFailed)

	var postsToday int
	database.QueryRow(`
		SELECT COUNT(1)
		FROM posts
		WHERE created_at >= date_trunc('day', NOW())
	`).Scan(&postsToday)

	// Исторические данные (за последние 30 дней)
	history := make([]dailyStat, 0)
	rows, err := database.Query(`
		SELECT date, total_groups, total_subscribers 
		FROM group_stats_history 
		ORDER BY date DESC 
		LIMIT 30
	`)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var stat dailyStat
			if err := rows.Scan(&stat.Date, &stat.TotalGroups, &stat.TotalSubscribers); err == nil {
				history = append(history, stat)
			}
		}
	}

	// Переворачиваем массив истории, чтобы он шел от старых к новым
	for i, j := 0, len(history)-1; i < j; i, j = i+1, j-1 {
		history[i], history[j] = history[j], history[i]
	}

	// Если мало данных для графика (0 или 1 точка), добиваем фиктивными точками за прошлые дни
	if len(history) == 0 {
		importTime := "2006-01-02"
		today := time.Now()
		history = append(history, dailyStat{
			Date:             today.AddDate(0, 0, -1).Format(importTime),
			TotalGroups:      totalGroups,
			TotalSubscribers: totalSubscribers,
		})
		history = append(history, dailyStat{
			Date:             today.Format(importTime),
			TotalGroups:      totalGroups,
			TotalSubscribers: totalSubscribers,
		})
	} else if len(history) == 1 {
		importTime := "2006-01-02"
		date, _ := time.Parse(importTime, history[0].Date)
		history = append([]dailyStat{{
			Date:             date.AddDate(0, 0, -1).Format(importTime),
			TotalGroups:      history[0].TotalGroups,
			TotalSubscribers: history[0].TotalSubscribers,
		}}, history[0])
	}

	response := map[string]interface{}{
		"total_groups":      totalGroups,
		"total_subscribers": totalSubscribers,
		"groups_ok":         groupsOK,
		"groups_error":      groupsError,
		"groups_unknown":    groupsUnknown,
		"posts_total":       postsTotal,
		"posts_pending":     postsPending,
		"posts_published":   postsPublished,
		"posts_rejected":    postsRejected,
		"posts_scheduled":   postsScheduled,
		"posts_failed":      postsFailed,
		"posts_today":       postsToday,
		"history":           history,
	}
	if lastGroupCheck.Valid {
		response["last_group_check_at"] = lastGroupCheck.Time.Format(time.RFC3339)
	}

	respondJSON(w, http.StatusOK, response)
}

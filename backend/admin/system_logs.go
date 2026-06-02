package admin

import (
	"backend/database"
	"backend/models"
	"backend/utils"
	"database/sql"
	"net/http"
	"regexp"
	"strconv"
	"strings"
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

	// Enrich logs with User, Group and Post details
	enrichLogsWithDetails(logs)

	utils.RespondSuccess(w, logs)
}

var groupIDRegex = regexp.MustCompile(`Group ID: (\d+)`)
var postIDRegex = regexp.MustCompile(`Post ID: (\d+)`)
var vkPostIDRegex = regexp.MustCompile(`VK Post ID: (\d+)`)

type publicationVKTarget struct {
	PostID    int
	VKPostID  int
	VKGroupID int
}

func enrichLogsWithDetails(logs []models.SystemLog) {
	if len(logs) == 0 {
		return
	}

	userIDsMap := make(map[int]bool)
	groupIDsMap := make(map[int]bool)
	postIDsMap := make(map[int]bool)

	for _, l := range logs {
		if l.UserID != nil {
			userIDsMap[*l.UserID] = true
		}
		if matches := groupIDRegex.FindStringSubmatch(l.Details); len(matches) > 1 {
			if id, err := strconv.Atoi(matches[1]); err == nil {
				groupIDsMap[id] = true
			}
		}
		if matches := postIDRegex.FindStringSubmatch(l.Details); len(matches) > 1 {
			if id, err := strconv.Atoi(matches[1]); err == nil {
				postIDsMap[id] = true
			}
		}
	}

	users := fetchUsers(userIDsMap)
	groups := fetchGroups(groupIDsMap)
	posts := fetchPosts(postIDsMap)
	publicationTargets := fetchPublicationVKTargets(postIDsMap)

	for i, l := range logs {
		if l.UserID != nil {
			if u, ok := users[*l.UserID]; ok {
				logs[i].User = &u
			}
		}
		if matches := groupIDRegex.FindStringSubmatch(l.Details); len(matches) > 1 {
			if id, err := strconv.Atoi(matches[1]); err == nil {
				if g, ok := groups[id]; ok {
					logs[i].Group = &g
				}
			}
		}
		if matches := postIDRegex.FindStringSubmatch(l.Details); len(matches) > 1 {
			if id, err := strconv.Atoi(matches[1]); err == nil {
				if p, ok := posts[id]; ok {
					if matches := vkPostIDRegex.FindStringSubmatch(l.Details); len(matches) > 1 {
						if vkPostID, err := strconv.Atoi(matches[1]); err == nil {
							p.VKPostID = vkPostID
							if target, ok := publicationTargets[publicationTargetKey(id, vkPostID)]; ok {
								p.VKGroupID = target.VKGroupID
							}
						}
					}
					if p.VKGroupID == 0 && logs[i].Group != nil {
						p.VKGroupID = logs[i].Group.VKGroupID
					}
					logs[i].Post = &p
				}
			}
		}
	}
}

func fetchUsers(idsMap map[int]bool) map[int]models.UserSummary {
	res := make(map[int]models.UserSummary)
	ids := getKeys(idsMap)
	if len(ids) == 0 {
		return res
	}
	query := `SELECT id, first_name, last_name, photo_200 FROM users WHERE id IN (` + joinInts(ids) + `)`
	rows, err := database.Query(query)
	if err != nil {
		return res
	}
	defer rows.Close()
	for rows.Next() {
		var u models.UserSummary
		var photo sql.NullString
		if err := rows.Scan(&u.ID, &u.FirstName, &u.LastName, &photo); err == nil {
			if photo.Valid {
				u.Photo200 = photo.String
			}
			res[u.ID] = u
		}
	}
	return res
}

func fetchGroups(idsMap map[int]bool) map[int]models.GroupSummary {
	res := make(map[int]models.GroupSummary)
	ids := getKeys(idsMap)
	if len(ids) == 0 {
		return res
	}
	query := `SELECT id, vk_group_id, name, screen_name, photo_200 FROM groups WHERE id IN (` + joinInts(ids) + `)`
	rows, err := database.Query(query)
	if err != nil {
		return res
	}
	defer rows.Close()
	for rows.Next() {
		var g models.GroupSummary
		var screen, photo sql.NullString
		if err := rows.Scan(&g.ID, &g.VKGroupID, &g.Name, &screen, &photo); err == nil {
			if screen.Valid {
				g.ScreenName = screen.String
			}
			if photo.Valid {
				g.Photo200 = photo.String
			}
			res[g.ID] = g
		}
	}
	return res
}

func publicationTargetKey(postID int, vkPostID int) string {
	return strconv.Itoa(postID) + ":" + strconv.Itoa(vkPostID)
}

func fetchPublicationVKTargets(idsMap map[int]bool) map[string]publicationVKTarget {
	res := make(map[string]publicationVKTarget)
	ids := getKeys(idsMap)
	if len(ids) == 0 {
		return res
	}
	query := `
		SELECT pp.post_id, pp.vk_post_id, g.vk_group_id
		FROM post_publications pp
		INNER JOIN groups g ON pp.group_id = g.id
		WHERE pp.post_id IN (` + joinInts(ids) + `) AND pp.vk_post_id IS NOT NULL
	`
	rows, err := database.Query(query)
	if err != nil {
		return res
	}
	defer rows.Close()
	for rows.Next() {
		var target publicationVKTarget
		if err := rows.Scan(&target.PostID, &target.VKPostID, &target.VKGroupID); err == nil {
			res[publicationTargetKey(target.PostID, target.VKPostID)] = target
		}
	}
	return res
}

func fetchPosts(idsMap map[int]bool) map[int]models.PostSummary {
	res := make(map[int]models.PostSummary)
	ids := getKeys(idsMap)
	if len(ids) == 0 {
		return res
	}
	query := `SELECT id, message FROM posts WHERE id IN (` + joinInts(ids) + `)`
	rows, err := database.Query(query)
	if err != nil {
		return res
	}
	defer rows.Close()
	for rows.Next() {
		var p models.PostSummary
		var msg sql.NullString
		if err := rows.Scan(&p.ID, &msg); err == nil {
			if msg.Valid {
				p.Message = msg.String
			}
			res[p.ID] = p
		}
	}
	return res
}

func getKeys(m map[int]bool) []int {
	keys := make([]int, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}

func joinInts(ints []int) string {
	strs := make([]string, len(ints))
	for i, v := range ints {
		strs[i] = strconv.Itoa(v)
	}
	return strings.Join(strs, ",")
}

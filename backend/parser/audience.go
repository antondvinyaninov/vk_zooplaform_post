package parser

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"backend/database"
	"backend/vk"
)

var (
	audienceTaskMutex   sync.Mutex
	currentAudienceTask int64
	audienceCancelFunc  context.CancelFunc
)

// StartAudienceCollection запускает сбор аудитории
func StartAudienceCollection(cityTitle string) (int64, error) {
	audienceTaskMutex.Lock()
	defer audienceTaskMutex.Unlock()

	if currentAudienceTask > 0 {
		return 0, fmt.Errorf("audience collection task is already running")
	}

	var taskID int64
	err := database.DB.QueryRow(`
		INSERT INTO audience_tasks (city_title, status)
		VALUES ($1, 'running')
		RETURNING id
	`, cityTitle).Scan(&taskID)
	if err != nil {
		return 0, err
	}

	ctx, cancel := context.WithCancel(context.Background())
	currentAudienceTask = taskID
	audienceCancelFunc = cancel

	go runAudienceCollection(ctx, taskID, cityTitle)

	return taskID, nil
}

func runAudienceCollection(ctx context.Context, taskID int64, cityTitle string) {
	defer func() {
		database.DB.Exec(`UPDATE audience_tasks SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, taskID)
		audienceTaskMutex.Lock()
		if currentAudienceTask == taskID {
			currentAudienceTask = 0
			audienceCancelFunc = nil
		}
		audienceTaskMutex.Unlock()
	}()

	token, err := getActiveVKToken()
	if err != nil || token == "" {
		log.Printf("Audience Error: No active VK token")
		database.DB.Exec(`UPDATE audience_tasks SET status = 'error', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, taskID)
		return
	}

	client := vk.NewVKClient(token)

	// Получаем все группы из этого города (только те, что не в черном списке)
	rows, err := database.DB.Query(`
		SELECT vk_group_id, members_count
		FROM parsed_groups
		WHERE city_title = $1 AND is_blacklisted = FALSE
	`, cityTitle)
	if err != nil {
		log.Printf("Audience Error fetching groups: %v", err)
		return
	}
	defer rows.Close()

	type grp struct {
		id    int64
		count int
	}
	var groupList []grp
	for rows.Next() {
		var g grp
		if err := rows.Scan(&g.id, &g.count); err == nil {
			groupList = append(groupList, g)
		}
	}
	rows.Close() // Explicitly close here so we can reuse DB connection in the loop

	database.DB.Exec(`UPDATE audience_tasks SET groups_total = $1 WHERE id = $2`, len(groupList), taskID)

	totalMembers := 0
	uniqueMembers := 0
	processedGroups := 0

	for _, g := range groupList {
		select {
		case <-ctx.Done():
			return
		default:
		}

		offset := 0
		fetchCount := 1000

		for {
			select {
			case <-ctx.Done():
				return
			default:
			}

			resp, err := client.GroupsGetMembers(int(g.id), offset, fetchCount)
			if err != nil {
				log.Printf("Audience VK API Error for group %d: %v", g.id, err)
				time.Sleep(2 * time.Second) // rate limit backoff
				break                       // Skip to next group on hard error to avoid infinite loop
			}

			if resp == nil || len(resp.Items) == 0 {
				break
			}

			// Пакетная вставка (ON CONFLICT DO NOTHING)
			for _, userID := range resp.Items {
				res, err := database.DB.Exec(`
					INSERT INTO audience_members (task_id, vk_user_id)
					VALUES ($1, $2)
					ON CONFLICT DO NOTHING
				`, taskID, userID)
				if err == nil {
					rowsAffected, _ := res.RowsAffected()
					if rowsAffected > 0 {
						uniqueMembers++
					}
				}
				totalMembers++
			}

			database.DB.Exec(`
				UPDATE audience_tasks 
				SET total_members = $1, unique_members = $2, updated_at = CURRENT_TIMESTAMP 
				WHERE id = $3
			`, totalMembers, uniqueMembers, taskID)

			offset += fetchCount
			time.Sleep(350 * time.Millisecond) // ~3 requests per second to respect VK limits

			if offset >= resp.Count {
				break
			}
		}

		processedGroups++
		database.DB.Exec(`UPDATE audience_tasks SET groups_processed = $1 WHERE id = $2`, processedGroups, taskID)
		time.Sleep(1 * time.Second) // Pause between groups
	}
}

// StopAudienceCollection останавливает текущую задачу
func StopAudienceCollection() {
	audienceTaskMutex.Lock()
	defer audienceTaskMutex.Unlock()

	if audienceCancelFunc != nil {
		audienceCancelFunc()
		audienceCancelFunc = nil
	}

	if currentAudienceTask > 0 {
		database.DB.Exec(`UPDATE audience_tasks SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, currentAudienceTask)
		currentAudienceTask = 0
	}
}

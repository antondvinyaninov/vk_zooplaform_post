package parser

import (
	"backend/database"
	"backend/vk"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"
)

var (
	currentTaskID int64
	cancelFunc    context.CancelFunc
	taskMutex     sync.Mutex
)

// StartParsing запускает задачу парсинга в фоне
func StartParsing(keywords []string, cities []string) (int64, error) {
	taskMutex.Lock()
	defer taskMutex.Unlock()

	// Если уже есть активная задача - отменяем
	if cancelFunc != nil {
		cancelFunc()
		cancelFunc = nil
	}

	// Создаем новую задачу в БД
	kwStr, _ := json.Marshal(keywords)
	ctStr, _ := json.Marshal(cities)

	var taskID int64
	err := database.QueryRow(`
		INSERT INTO parser_tasks (keywords, cities, status)
		VALUES ($1, $2, 'running')
		RETURNING id
	`, string(kwStr), string(ctStr)).Scan(&taskID)
	if err != nil {
		return 0, fmt.Errorf("failed to create task: %v", err)
	}

	currentTaskID = taskID

	// Создаем контекст для остановки
	ctx, cancel := context.WithCancel(context.Background())
	cancelFunc = cancel

	go runParsingTask(ctx, taskID, keywords, cities)

	return taskID, nil
}

// StopParsing останавливает текущую задачу
func StopParsing() error {
	taskMutex.Lock()
	defer taskMutex.Unlock()

	if cancelFunc != nil {
		cancelFunc()
		cancelFunc = nil
	}

	if currentTaskID > 0 {
		database.Exec(`UPDATE parser_tasks SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, currentTaskID)
		currentTaskID = 0
	}

	return nil
}

func getActiveVKToken() (string, error) {
	var token string
	err := database.QueryRow(`
		SELECT access_token
		FROM vk_accounts
		WHERE is_active = true
		ORDER BY updated_at DESC
		LIMIT 1
	`).Scan(&token)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(token), nil
}

func runParsingTask(ctx context.Context, taskID int64, keywords []string, cities []string) {
	defer func() {
		database.Exec(`UPDATE parser_tasks SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, taskID)
		taskMutex.Lock()
		if currentTaskID == taskID {
			currentTaskID = 0
			cancelFunc = nil
		}
		taskMutex.Unlock()
	}()

	token, err := getActiveVKToken()
	if err != nil || token == "" {
		log.Printf("Parser Error: No active VK token found")
		database.Exec(`UPDATE parser_tasks SET status = 'error', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, taskID)
		return
	}

	client := vk.NewVKClient(token)
	totalFound := 0

	for _, city := range cities {
		select {
		case <-ctx.Done():
			return
		default:
		}

		database.Exec(`UPDATE parser_tasks SET current_city = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, city, taskID)

		// Получаем CityID, если это число (ID). Если это строка, то в идеале нужно найти ID, но пока будем считать что передают ID.
		var cityID int
		fmt.Sscanf(city, "%d", &cityID)

		for _, keyword := range keywords {
			select {
			case <-ctx.Done():
				return
			default:
			}

			offset := 0
			// VK API limit is 1000 per search, groups.search count max is 1000.
			fetchCount := 1000

			searchResp, err := client.GroupsSearch(keyword, cityID, offset, fetchCount)
			if err != nil {
				log.Printf("Parser VK API Error for %s: %v", keyword, err)
				time.Sleep(2 * time.Second)
				continue
			}

			if searchResp == nil || len(searchResp.Items) == 0 {
				time.Sleep(500 * time.Millisecond) // rate limit
				continue
			}

			// Для каждой найденной группы получаем подробную инфу порциями по 500 (лимит getById)
			var groupIDs []string
			for _, g := range searchResp.Items {
				groupIDs = append(groupIDs, fmt.Sprintf("%d", g.ID))
			}

			for i := 0; i < len(groupIDs); i += 500 {
				select {
				case <-ctx.Done():
					return
				default:
				}

				end := i + 500
				if end > len(groupIDs) {
					end = len(groupIDs)
				}
				batch := groupIDs[i:end]

				details, err := client.GroupsGetByIds(batch, "city,contacts,description,members_count,links")
				if err != nil {
					log.Printf("Parser GroupsGetByIds error: %v", err)
					time.Sleep(2 * time.Second)
					continue
				}

				// Сохраняем в БД
				for _, detail := range details {
					var cityTitle string
					if detail.City != nil {
						cityTitle = detail.City.Title
					}

					contactsStr, _ := json.Marshal(detail.Contacts)
					linksStr, _ := json.Marshal(detail.Links)

					_, err := database.Exec(`
						INSERT INTO parsed_groups (task_id, vk_group_id, name, screen_name, city_title, members_count, description, contacts, links)
						VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
						ON CONFLICT (task_id, vk_group_id) DO NOTHING
					`, taskID, detail.ID, detail.Name, detail.ScreenName, cityTitle, detail.MembersCount, detail.Description, string(contactsStr), string(linksStr))
					
					if err == nil {
						totalFound++
					}
				}
				
				database.Exec(`UPDATE parser_tasks SET total_found = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, totalFound, taskID)
				time.Sleep(1 * time.Second) // rate limit
			}

			time.Sleep(1 * time.Second) // rate limit
		}
	}
}

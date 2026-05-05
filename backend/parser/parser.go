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

		var cityID int
		fmt.Sscanf(city, "%d", &cityID)

		for _, keyword := range keywords {
			select {
			case <-ctx.Done():
				return
			default:
			}

			offset := 0
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

				for _, detail := range details {
					// Check members count
					if detail.MembersCount < 500 {
						continue
					}

					// Smart filtering
					if !isRelevantGroup(detail, cityID) {
						continue
					}

					var cityTitle string
					if detail.City != nil {
						cityTitle = detail.City.Title
					}

					contactsStr, _ := json.Marshal(detail.Contacts)
					linksStr, _ := json.Marshal(detail.Links)

					// UPSERT query for master list
					_, err := database.Exec(`
						INSERT INTO parsed_groups (task_id, vk_group_id, name, screen_name, city_title, members_count, description, contacts, links)
						VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
						ON CONFLICT (vk_group_id) DO UPDATE SET 
							members_count = EXCLUDED.members_count,
							task_id = EXCLUDED.task_id,
							updated_at = CURRENT_TIMESTAMP
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

func isRelevantGroup(g vk.Group, currentCityID int) bool {
	text := strings.ToLower(g.Name + " " + g.Description)

	// Custom split by non-letters/numbers
	f := func(c rune) bool {
		return !((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= 'а' && c <= 'я') || (c >= 'А' && c <= 'Я') || (c >= '0' && c <= '9'))
	}
	words := strings.FieldsFunc(text, f)

	wordSet := make(map[string]bool)
	for _, w := range words {
		wordSet[w] = true
	}

	hasPrefixInWords := func(prefixes []string) bool {
		for _, w := range words {
			for _, p := range prefixes {
				if strings.HasPrefix(w, p) {
					return true
				}
			}
		}
		return false
	}

	hasExactInWords := func(exacts []string) bool {
		for _, e := range exacts {
			if wordSet[e] {
				return true
			}
		}
		return false
	}

	containsPhrase := func(phrases []string) bool {
		for _, p := range phrases {
			if strings.Contains(text, p) {
				return true
			}
		}
		return false
	}

	stopPrefixes := []string{
		"авторынок", "недвижимост", "грузоперевозк",
		"эзотерик", "космоэнергетик", "астролог", "гадан", "таро",
		"целител", "заработок", "инвестици",
		"депутат", "аниме", "наруто",
		"кинопоказ", "ксго", "dota",
	}

	stopPhrases := []string{
		"детская одежда", "женская одежда", "мужская одежда",
		"отдам даром вещи", "доска объявлений", "продажа авто",
		"дети африки", "стрижка собак", "политическая партия",
	}

	// Exceptions to stop phrases: "доска объявлений" is allowed if there are clear animal markers.
	if containsPhrase([]string{"доска объявлений"}) {
		// Only check other stop conditions
		if hasPrefixInWords(stopPrefixes) || hasExactInWords([]string{"магия", "маги", "бизнес", "психолог", "спектакль", "концерт", "прайс", "смартфон", "айфон", "пряжа", "наука", "фильм", "сериал", "театр", "игры"}) {
			return false
		}
	} else {
		if hasPrefixInWords(stopPrefixes) || containsPhrase(stopPhrases) || hasExactInWords([]string{"магия", "маги", "бизнес", "психолог", "спектакль", "концерт", "прайс", "смартфон", "айфон", "пряжа", "наука", "фильм", "сериал", "театр", "игры"}) {
			return false
		}
	}

	if g.City != nil && g.City.ID != 0 && currentCityID != 0 && g.City.ID != currentCityID {
		return false
	}

	animalPrefixes := []string{
		"собак", "собач", "кошк", "кошач", "щено", "щенк", "животн", "питомц", "хвостик",
		"четвероног", "дворняж", "котят", "котик", "зверюшк",
	}
	animalExacts := []string{
		"кот", "кота", "коту", "котом", "коте", "коты", "котов", "котам", "котами", "котах",
		"пес", "пёс", "пса", "псу", "псом", "псе", "псы", "псов", "псам", "псами", "псах",
		"зверь", "зверя", "зверю", "зверем", "звери", "зверям", "зверями", "зверях",
	}

	if !hasPrefixInWords(animalPrefixes) && !hasExactInWords(animalExacts) {
		return false
	}

	salesPrefixes := []string{"купит", "продам", "продаж", "скидк", "питомник", "груминг", "зоомагазин", "вязк", "барахолк"}
	salesPhrases := []string{"продаются щенки", "продаются котята", "в продаже", "наша цена"}
	if hasPrefixInWords(salesPrefixes) || containsPhrase(salesPhrases) || hasExactInWords([]string{"доставка", "магазин", "магазины", "цена", "цены"}) {
		allowedSalesPrefixes := []string{"приют", "спасен", "благотворительн", "волонтер", "пожертв"}
		if !hasPrefixInWords(allowedSalesPrefixes) && !containsPhrase([]string{"помощь бездомным"}) && !hasExactInWords([]string{"сбор", "фонд"}) {
			return false
		}
	}

	requiredPrefixes := []string{
		"приют", "зоозащит", "бездомн", "спасени", "спасаем", "потеряшк",
		"передержк", "благотворительн", "фонд",
	}
	requiredPhrases := []string{
		"ищут дом", "в добрые руки", "помощь животн", "помощь бездомн",
		"помощь собакам", "помощь кошкам", "освв",
	}
	requiredExacts := []string{"помощь", "помочь", "помогать", "спасти"}

	// "доска объявлений" is only allowed if it explicitly asks for help or relates to shelter activities based on requirements.
	// We allow it if the required prefixes pass.
	if !hasPrefixInWords(requiredPrefixes) && !containsPhrase(requiredPhrases) && !hasExactInWords(requiredExacts) {
		return false
	}

	return true
}

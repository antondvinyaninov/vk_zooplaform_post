package parser

import (
	"backend/database"
	"backend/middleware"
	"backend/vk"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
)

// RegisterRoutes регистрирует маршруты для парсера
func RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/admin/parser/start", middleware.CORSFunc(StartParserHandler))
	mux.HandleFunc("/api/admin/parser/stop", middleware.CORSFunc(StopParserHandler))
	mux.HandleFunc("/api/admin/parser/status", middleware.CORSFunc(GetParserStatusHandler))
	mux.HandleFunc("/api/admin/parser/results", middleware.CORSFunc(GetParserResultsHandler))
	mux.HandleFunc("/api/admin/parser/blacklist", middleware.CORSFunc(BlacklistGroupHandler))
	mux.HandleFunc("/api/admin/parser/add-manual", middleware.CORSFunc(AddManualGroupHandler))
	mux.HandleFunc("/api/admin/parser/clear", middleware.CORSFunc(ClearMasterListHandler))
	mux.HandleFunc("/api/admin/parser/cities", middleware.CORSFunc(GetCitiesHandler))
}

func GetCitiesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	query := r.URL.Query().Get("q")
	if query == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"items": []interface{}{}})
		return
	}

	token, err := getActiveVKToken()
	if err != nil {
		http.Error(w, "No active VK token found", http.StatusInternalServerError)
		return
	}

	client := vk.NewVKClient(token)
	citiesResp, err := client.DatabaseGetCities(query)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(citiesResp)
}

func ClearMasterListHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	_, err := database.Exec(`TRUNCATE TABLE parsed_groups RESTART IDENTITY`)
	if err != nil {
		http.Error(w, "Failed to clear table", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

// API handlers for Parser
func StartParserHandler(w http.ResponseWriter, r *http.Request) {
	var req StartParserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	keywordsRaw := strings.Split(req.Keywords, ",")
	var keywords []string
	for _, kw := range keywordsRaw {
		k := strings.TrimSpace(kw)
		if k != "" {
			keywords = append(keywords, k)
		}
	}

	citiesRaw := strings.Split(req.Cities, ",")
	var cities []string
	for _, city := range citiesRaw {
		c := strings.TrimSpace(city)
		if c != "" {
			cities = append(cities, c)
		}
	}

	if len(keywords) == 0 || len(cities) == 0 {
		http.Error(w, "Keywords and Cities are required", http.StatusBadRequest)
		return
	}

	taskID, err := StartParsing(keywords, cities)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"task_id": taskID,
	})
}

func StopParserHandler(w http.ResponseWriter, r *http.Request) {
	StopParsing()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
	})
}

func GetParserStatusHandler(w http.ResponseWriter, r *http.Request) {
	taskMutex.Lock()
	tid := currentTaskID
	taskMutex.Unlock()

	var task ParserTask
	
	// Если есть активная задача, берем ее
	if tid > 0 {
		err := database.QueryRow(`
			SELECT id, keywords, cities, status, total_found, current_city, created_at, updated_at
			FROM parser_tasks
			WHERE id = $1
		`, tid).Scan(&task.ID, &task.Keywords, &task.Cities, &task.Status, &task.TotalFound, &task.CurrentCity, &task.CreatedAt, &task.UpdatedAt)
		if err != nil {
			http.Error(w, "Error fetching task status", http.StatusInternalServerError)
			return
		}
	} else {
		// Иначе берем последнюю
		err := database.QueryRow(`
			SELECT id, keywords, cities, status, total_found, current_city, created_at, updated_at
			FROM parser_tasks
			ORDER BY id DESC LIMIT 1
		`).Scan(&task.ID, &task.Keywords, &task.Cities, &task.Status, &task.TotalFound, &task.CurrentCity, &task.CreatedAt, &task.UpdatedAt)
		if err != nil {
			// No tasks yet
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(nil)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(task)
}

func GetParserResultsHandler(w http.ResponseWriter, r *http.Request) {
	export := r.URL.Query().Get("export")

	var rows *sql.Rows
	var err error

	if export == "csv" {
		rows, err = database.Query(`
			SELECT id, vk_group_id, name, screen_name, city_title, members_count, description, contacts, links, created_at
			FROM parsed_groups
			WHERE is_blacklisted = FALSE
			ORDER BY members_count DESC
		`)
	} else {
		pageStr := r.URL.Query().Get("page")
		page, _ := strconv.Atoi(pageStr)
		if page < 1 {
			page = 1
		}
		limit := 100
		offset := (page - 1) * limit

		rows, err = database.Query(`
			SELECT id, vk_group_id, name, screen_name, city_title, members_count, description, contacts, links, created_at
			FROM parsed_groups
			WHERE is_blacklisted = FALSE
			ORDER BY members_count DESC
			LIMIT $1 OFFSET $2
		`, limit, offset)
	}
	
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	if export == "csv" {
		w.Header().Set("Content-Type", "text/csv; charset=utf-8")
		w.Header().Set("Content-Disposition", "attachment; filename=parsed_groups_master.csv")
		
		w.Write([]byte{0xEF, 0xBB, 0xBF})
		w.Write([]byte("ID,VK Group ID,Название,Screen Name,Город,Подписчики,Контакты,Ссылка\n"))
		
		for rows.Next() {
			var id, vkGroupID int64
			var name, screenName, cityTitle sql.NullString
			var membersCount int
			var desc, contacts, links sql.NullString
			var createdAt string
			
			err := rows.Scan(&id, &vkGroupID, &name, &screenName, &cityTitle, &membersCount, &desc, &contacts, &links, &createdAt)
			if err != nil {
				continue
			}

			n := strings.ReplaceAll(name.String, "\"", "\"\"")
			c := strings.ReplaceAll(cityTitle.String, "\"", "\"\"")
			
			var contactsParsed string
			if contacts.Valid && contacts.String != "" {
				var cnts []struct {
					Desc  string `json:"desc"`
					Phone string `json:"phone"`
					Email string `json:"email"`
				}
				if err := json.Unmarshal([]byte(contacts.String), &cnts); err == nil {
					var cStrs []string
					for _, c := range cnts {
						cStrs = append(cStrs, c.Desc+" "+c.Phone+" "+c.Email)
					}
					contactsParsed = strings.Join(cStrs, ", ")
				}
			}
			cp := strings.ReplaceAll(contactsParsed, "\"", "\"\"")
			link := "https://vk.com/" + screenName.String
			if screenName.String == "" {
				link = fmt.Sprintf("https://vk.com/club%d", vkGroupID)
			}

			line := fmt.Sprintf("%d,%d,\"%s\",\"%s\",\"%s\",%d,\"%s\",\"%s\"\n", 
				id, vkGroupID, n, screenName.String, c, membersCount, cp, link)
			w.Write([]byte(line))
		}
		return
	}

	var groups []ParsedGroup
	for rows.Next() {
		var g ParsedGroup
		var contacts, links, desc sql.NullString
		
		err := rows.Scan(&g.ID, &g.VKGroupID, &g.Name, &g.ScreenName, &g.CityTitle, &g.MembersCount, &desc, &contacts, &links, &g.CreatedAt)
		if err != nil {
			continue
		}
		if contacts.Valid {
			g.Contacts = contacts.String
		}
		if links.Valid {
			g.Links = links.String
		}
		if desc.Valid {
			g.Description = desc.String
		}
		groups = append(groups, g)
	}

	var total int
	database.QueryRow(`SELECT COUNT(1) FROM parsed_groups WHERE is_blacklisted = FALSE`).Scan(&total)

	pageStr := r.URL.Query().Get("page")
	page, _ := strconv.Atoi(pageStr)
	if page < 1 {
		page = 1
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"items": groups,
		"total": total,
		"page":  page,
		"limit": 100,
	})
}

type BlacklistRequest struct {
	ID int64 `json:"id"`
}

func BlacklistGroupHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req BlacklistRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	_, err := database.Exec(`UPDATE parsed_groups SET is_blacklisted = TRUE WHERE id = $1`, req.ID)
	if err != nil {
		http.Error(w, "Failed to update", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

type AddManualRequest struct {
	LinkOrID string `json:"link_or_id"`
}

func AddManualGroupHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req AddManualRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	groupIDStr := req.LinkOrID
	// Extract screen_name or ID
	groupIDStr = strings.TrimPrefix(groupIDStr, "https://vk.com/")
	groupIDStr = strings.TrimPrefix(groupIDStr, "vk.com/")
	groupIDStr = strings.TrimPrefix(groupIDStr, "club")
	groupIDStr = strings.TrimPrefix(groupIDStr, "public")

	token, err := getActiveVKToken()
	if err != nil || token == "" {
		http.Error(w, "No active VK token", http.StatusInternalServerError)
		return
	}

	client := vk.NewVKClient(token)
	details, err := client.GroupsGetByIds([]string{groupIDStr}, "city,contacts,description,members_count,links")
	if err != nil || len(details) == 0 {
		http.Error(w, "Group not found or API error", http.StatusBadRequest)
		return
	}

	detail := details[0]
	var cityTitle string
	if detail.City != nil {
		cityTitle = detail.City.Title
	}

	contactsStr, _ := json.Marshal(detail.Contacts)
	linksStr, _ := json.Marshal(detail.Links)

	_, err = database.Exec(`
		INSERT INTO parsed_groups (vk_group_id, name, screen_name, city_title, members_count, description, contacts, links, is_manual)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
		ON CONFLICT (vk_group_id) DO UPDATE SET 
			is_blacklisted = FALSE,
			members_count = EXCLUDED.members_count,
			updated_at = CURRENT_TIMESTAMP
	`, detail.ID, detail.Name, detail.ScreenName, cityTitle, detail.MembersCount, detail.Description, string(contactsStr), string(linksStr))

	if err != nil {
		http.Error(w, "DB error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

package parser

import "time"

// ParserTask представляет задачу парсинга
type ParserTask struct {
	ID           int64     `json:"id"`
	Keywords     string    `json:"keywords"`
	Cities       string    `json:"cities"`
	Status       string    `json:"status"` // running, paused, completed, error
	TotalFound   int       `json:"total_found"`
	CurrentCity  string    `json:"current_city"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// ParsedGroup представляет спарсенную группу
type ParsedGroup struct {
	ID           int64     `json:"id"`
	TaskID       int64     `json:"task_id"`
	VKGroupID    int64     `json:"vk_group_id"`
	Name         string    `json:"name"`
	ScreenName   string    `json:"screen_name"`
	CityTitle    string    `json:"city_title"`
	MembersCount int       `json:"members_count"`
	Description  string    `json:"description"`
	Contacts     string    `json:"contacts"`
	Links        string    `json:"links"`
	CreatedAt    time.Time `json:"created_at"`
}

// StartParserRequest запрос на запуск парсера
type StartParserRequest struct {
	Keywords string `json:"keywords"`
	Cities   string `json:"cities"` // В виде JSON-массива или через запятую, например "Ижевск, Глазов, Сарапул"
}

package models

import (
	"backend/database"
	"log"
	"time"
)

type SystemLog struct {
	ID        int       `json:"id"`
	Level     string    `json:"level"`
	Action    string    `json:"action"`
	Message   string    `json:"message"`
	UserID    *int      `json:"user_id"`
	Details   string    `json:"details"`
	CreatedAt time.Time `json:"created_at"`
}

func CreateSystemLog(level, action, message string, userID *int, details string) {
	// Мы пишем лог в базу данных асинхронно или синхронно. Сделаем синхронно, но безопасно, чтобы не ронять основной процесс.
	go func() {
		query := `
			INSERT INTO system_logs (level, action, message, user_id, details)
			VALUES (?, ?, ?, ?, ?)
		`
		_, err := database.Exec(query, level, action, message, userID, details)
		if err != nil {
			log.Printf("❌ Ошибка при записи лога в БД [%s]: %v", level, err)
		}
	}()
}

func LogInfo(action, message string, userID *int, details string) {
	CreateSystemLog("INFO", action, message, userID, details)
}

func LogWarning(action, message string, userID *int, details string) {
	CreateSystemLog("WARNING", action, message, userID, details)
}

func LogError(action, message string, userID *int, details string) {
	CreateSystemLog("ERROR", action, message, userID, details)
}

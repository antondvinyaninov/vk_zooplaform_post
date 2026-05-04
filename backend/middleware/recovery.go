package middleware

import (
	"backend/database"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"runtime/debug"
)

// Recovery это middleware, который перехватывает паники в обработчиках HTTP запросов,
// предотвращает падение сервера и логирует ошибку в БД (таблица system_logs).
func Recovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				// 1. Получаем стек вызовов
				stack := string(debug.Stack())

				// 2. Формируем подробности об ошибке
				log.Printf("\n[PANIC RECOVERED]\nError: %v\nStack: %s\n", err, stack)

				// 3. Записываем в базу данных
				go func() {
					// Мы выполняем это в горутине, чтобы не блокировать текущий ответ,
					// но надо быть осторожным: если БД упала, эта горутина тоже не сможет записать лог.
					// Для надежности используем отдельное подключение или просто Exec.
					query := `
						INSERT INTO system_logs (level, action, message, details) 
						VALUES ($1, $2, $3, $4)
					`
					_, dbErr := database.Exec(query, "FATAL", "PANIC_RECOVERY", fmt.Sprintf("%v", err), stack)
					if dbErr != nil {
						log.Printf("[PANIC RECOVERY] Ошибка при записи в system_logs: %v", dbErr)
					}
				}()

				// 4. Отправляем корректный 500 ответ клиенту
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(map[string]string{
					"error":   "Внутренняя ошибка сервера",
					"details": "Произошел критический сбой. Ошибка зафиксирована.",
				})
			}
		}()

		// Вызываем следующий обработчик
		next.ServeHTTP(w, r)
	})
}

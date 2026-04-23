package main

import (
	"backend/admin"
	"backend/config"
	"backend/database"
	"backend/middleware"
	"backend/site"
	vkapp "backend/vk-app"
	"log"
	"net/http"
)

func main() {
	// Загружаем конфигурацию
	cfg := config.Load()
	log.Printf("Starting VK ZooPlatforma API on port %s", cfg.Port)

	// Инициализируем базу данных
	if err := database.Init(cfg.DatabasePath); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()
	log.Println("Database initialized successfully")

	// Создаем роутер
	mux := http.NewServeMux()

	// Регистрируем маршруты для каждого модуля (только API)
	admin.RegisterRoutes(mux)
	vkapp.RegisterRoutes(mux)
	site.RegisterRoutes(mux)

	// Health check для всего приложения
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","service":"vk-zooplatforma","version":"1.0.0"}`))
	})

	// Применяем middleware
	handler := middleware.Logger(middleware.CORS(mux))

	// Запускаем сервер
	log.Printf("API Server listening on :%s", cfg.Port)
	log.Println("✓ API: http://localhost:" + cfg.Port + "/api/")
	log.Println("✓ VK App API: http://localhost:" + cfg.Port + "/api/app/")
	log.Println("✓ Site API: http://localhost:" + cfg.Port + "/api/site/")

	if err := http.ListenAndServe(":"+cfg.Port, handler); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

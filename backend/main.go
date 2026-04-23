package main

import (
	"backend/admin"
	"backend/config"
	"backend/database"
	"backend/middleware"
	"backend/site"
	vkapp "backend/vk-app"
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	// Загружаем конфигурацию
	cfg := config.Load()
	log.Printf("=== VK ZooPlatforma Backend Starting ===")
	log.Printf("Port: %s", cfg.Port)
	log.Printf("Database Path: %s", cfg.DatabasePath)
	log.Printf("VK Client ID: %s", cfg.VKClientID)
	log.Printf("VK Mini App ID: %s", cfg.VKMiniAppID)

	// Инициализируем базу данных
	log.Printf("Initializing database...")
	if err := database.Init(cfg.DatabasePath); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()
	log.Println("✓ Database initialized successfully")

	// Создаем роутер
	log.Printf("Setting up routes...")
	mux := http.NewServeMux()

	// Регистрируем маршруты для каждого модуля (только API)
	log.Printf("Registering admin routes...")
	admin.RegisterRoutes(mux)
	log.Printf("Registering vk-app routes...")
	vkapp.RegisterRoutes(mux)
	log.Printf("Registering site routes...")
	site.RegisterRoutes(mux)

	// Health check для всего приложения
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		log.Printf("Health check requested from %s", r.RemoteAddr)
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","service":"vk-zooplatforma","version":"1.0.0"}`))
	})

	// Применяем middleware
	log.Printf("Applying middleware...")
	handler := middleware.Logger(middleware.CORS(mux))

	// Запускаем сервер
	log.Printf("=== Starting HTTP Server ===")
	log.Printf("API Server listening on :%s", cfg.Port)
	log.Println("✓ API: http://localhost:" + cfg.Port + "/api/")
	log.Println("✓ VK App API: http://localhost:" + cfg.Port + "/api/app/")
	log.Println("✓ Site API: http://localhost:" + cfg.Port + "/api/site/")
	log.Printf("=== Server Ready ===")

	// Создаем HTTP сервер
	server := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: handler,
	}

	// Канал для graceful shutdown
	quit := make(chan os.Signal, 1)
	// Игнорируем SIGQUIT, обрабатываем только SIGINT и SIGTERM
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	// Запускаем сервер в горутине
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	log.Printf("=== Server is running, waiting for signals ===")

	// Ждем сигнал остановки
	sig := <-quit
	log.Printf("Received signal: %v", sig)
	log.Printf("Shutting down server...")

	// Graceful shutdown с таймаутом
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Printf("Server exited")
}

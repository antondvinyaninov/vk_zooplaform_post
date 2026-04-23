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
	"strings"
	"syscall"
	"time"
)

func main() {
	// Загружаем конфигурацию
	cfg := config.Load()

	// Принудительно устанавливаем порт 80 для продакшена
	if os.Getenv("PORT") == "" {
		cfg.Port = "80"
	}

	log.Printf("=== VK ZooPlatforma Backend Starting ===")
	log.Printf("Environment PORT: %s", os.Getenv("PORT"))
	log.Printf("Final Port: %s", cfg.Port)
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

	// VK Mini App - специальная обработка с заголовками для iframe
	mux.HandleFunc("/vk_app/", func(w http.ResponseWriter, r *http.Request) {
		log.Printf("📱 VK Mini App request: %s", r.URL.Path)

		// Заголовки для работы в VK iframe
		w.Header().Set("X-Frame-Options", "ALLOWALL")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, x-vk-sign")

		// Убираем /vk_app/ из пути для поиска файла
		filePath := "/usr/share/nginx/html/vk_app" + strings.TrimPrefix(r.URL.Path, "/vk_app")

		// Если путь заканчивается на /, ищем index.html
		if strings.HasSuffix(filePath, "/") {
			filePath += "index.html"
		}

		// Проверяем существование файла
		if _, err := os.Stat(filePath); err != nil {
			// Если файл не найден, возвращаем index.html (SPA fallback)
			filePath = "/usr/share/nginx/html/vk_app/index.html"
		}

		log.Printf("📱 Serving VK Mini App file: %s", filePath)
		http.ServeFile(w, r, filePath)
	})

	// Альтернативный endpoint для VK Mini App без ограничений
	mux.HandleFunc("/vk_app_embed/", func(w http.ResponseWriter, r *http.Request) {
		log.Printf("📱 VK Mini App embed request: %s", r.URL.Path)

		// Максимально открытые заголовки для VK
		w.Header().Set("X-Frame-Options", "ALLOWALL")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, x-vk-sign")

		// Всегда возвращаем index.html для этого endpoint
		http.ServeFile(w, r, "/usr/share/nginx/html/vk_app/index.html")
	})

	// Статические файлы фронтенда
	log.Printf("Setting up static file serving...")

	// Главная страница
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			log.Printf("🏠 Serving index.html to %s", r.RemoteAddr)
			http.ServeFile(w, r, "/usr/share/nginx/html/index.html")
			return
		}

		// Статические файлы
		filePath := "/usr/share/nginx/html" + r.URL.Path
		if _, err := os.Stat(filePath); err == nil {
			log.Printf("📁 Serving static file: %s", r.URL.Path)
			http.ServeFile(w, r, filePath)
			return
		}

		// 404
		log.Printf("❌ 404: %s", r.URL.Path)
		http.NotFound(w, r)
	})

	// Health check для всего приложения
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		log.Printf("🏥 API Health check: %s %s from %s (User-Agent: %s)", r.Method, r.URL.Path, r.RemoteAddr, r.UserAgent())
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","service":"vk-zooplatforma","version":"1.0.0"}`))
	})

	// Дополнительные health check эндпоинты для платформы деплоя
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		log.Printf("🏥 Root Health check: %s %s from %s (User-Agent: %s)", r.Method, r.URL.Path, r.RemoteAddr, r.UserAgent())
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
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

	// Создаем HTTP сервер (принудительно на порту 80)
	server := &http.Server{
		Addr:    ":80", // Хардкод порт 80 для продакшена
		Handler: handler,
	}

	log.Printf("🌐 Server HARDCODED to bind to: :80")

	// Канал для отслеживания ВСЕХ сигналов (включая SIGQUIT)
	allSignals := make(chan os.Signal, 1)
	signal.Notify(allSignals, syscall.SIGINT, syscall.SIGTERM, syscall.SIGQUIT, syscall.SIGHUP, syscall.SIGUSR1, syscall.SIGUSR2)

	// Канал для graceful shutdown (только критичные сигналы)
	quit := make(chan os.Signal, 1)
	// Игнорируем SIGQUIT, обрабатываем только SIGINT и SIGTERM
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	// Горутина для логирования всех сигналов
	go func() {
		for {
			sig := <-allSignals
			log.Printf("🚨 SIGNAL RECEIVED: %v (PID: %d)", sig, os.Getpid())

			switch sig {
			case syscall.SIGQUIT:
				log.Printf("📋 SIGQUIT received - this is usually sent by:")
				log.Printf("   - Docker/container orchestrator")
				log.Printf("   - Health check failure")
				log.Printf("   - Resource limits exceeded")
				log.Printf("   - Platform deployment system")
				log.Printf("🔄 Ignoring SIGQUIT - server continues running...")
			case syscall.SIGINT:
				log.Printf("⚠️  SIGINT received - user interrupt (Ctrl+C)")
				quit <- sig
			case syscall.SIGTERM:
				log.Printf("⚠️  SIGTERM received - termination request")
				quit <- sig
			case syscall.SIGHUP:
				log.Printf("📡 SIGHUP received - hangup signal")
			case syscall.SIGUSR1:
				log.Printf("👤 SIGUSR1 received - user defined signal 1")
			case syscall.SIGUSR2:
				log.Printf("👤 SIGUSR2 received - user defined signal 2")
			default:
				log.Printf("❓ Unknown signal received: %v", sig)
			}
		}
	}()

	// Логируем информацию о процессе
	log.Printf("🔍 Process Info:")
	log.Printf("   PID: %d", os.Getpid())
	log.Printf("   PPID: %d", os.Getppid())
	log.Printf("   UID: %d", os.Getuid())
	log.Printf("   GID: %d", os.Getgid())

	// Запускаем сервер в горутине
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	log.Printf("=== Server is running, waiting for signals ===")

	// Логируем время работы каждые 5 секунд
	ticker := time.NewTicker(5 * time.Second)
	go func() {
		startTime := time.Now()
		for {
			select {
			case <-ticker.C:
				uptime := time.Since(startTime)
				log.Printf("⏰ Server uptime: %v", uptime)
			}
		}
	}()

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

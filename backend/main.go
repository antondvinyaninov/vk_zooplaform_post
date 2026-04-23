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
	"os"
	"strings"
)

func main() {
	// Загружаем конфигурацию
	cfg := config.Load()
	log.Printf("Starting VK ZooPlatforma on port %s", cfg.Port)

	// Инициализируем базу данных
	if err := database.Init(cfg.DatabasePath); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()
	log.Println("Database initialized successfully")

	// Создаем роутер
	mux := http.NewServeMux()

	// Регистрируем маршруты для каждого модуля
	admin.RegisterRoutes(mux)
	vkapp.RegisterRoutes(mux)
	site.RegisterRoutes(mux)

	// Health check для всего приложения
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","service":"vk-zooplatforma","version":"1.0.0"}`))
	})

	// VK Mini App - обслуживаем собранные файлы
	vkAppHandler := http.StripPrefix("/vk_app", http.FileServer(http.Dir("./vk_app/build")))
	mux.Handle("/vk_app/", vkAppHandler)

	// URL rewriting middleware для красивых URL
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		// Если это API запрос, пропускаем
		if strings.HasPrefix(path, "/api/") {
			http.NotFound(w, r)
			return
		}

		// Если это VK Mini App, пропускаем (обрабатывается выше)
		if strings.HasPrefix(path, "/vk_app/") {
			http.NotFound(w, r)
			return
		}

		// Если это статический файл (css, js, изображения), отдаем как есть
		if strings.Contains(path, ".") && !strings.HasSuffix(path, ".html") {
			fs := http.FileServer(http.Dir("./frontend"))
			fs.ServeHTTP(w, r)
			return
		}

		// URL rewriting для страниц
		var filePath string
		switch path {
		case "/":
			filePath = "/index.html"
		case "/dashboard":
			filePath = "/pages/dashboard.html"
		case "/auth":
			filePath = "/index.html"
		case "/vk-connect":
			filePath = "/pages/vk-connect.html"
		case "/groups":
			filePath = "/pages/groups.html"
		case "/posts":
			filePath = "/pages/posts.html"
		case "/settings":
			filePath = "/pages/settings.html"
		case "/users":
			filePath = "/pages/users.html"
		default:
			// Если путь заканчивается на /, добавляем index.html
			if strings.HasSuffix(path, "/") {
				filePath = path + "index.html"
			} else {
				// Пробуем добавить .html
				filePath = path + ".html"
			}
		}

		// Читаем файл напрямую
		fullPath := "./frontend" + filePath
		content, err := os.ReadFile(fullPath)
		if err != nil {
			http.NotFound(w, r)
			return
		}

		// Определяем Content-Type
		var contentType string
		switch {
		case strings.HasSuffix(filePath, ".html"):
			contentType = "text/html; charset=utf-8"
		case strings.HasSuffix(filePath, ".css"):
			contentType = "text/css"
		case strings.HasSuffix(filePath, ".js"):
			contentType = "application/javascript"
		default:
			contentType = "text/plain"
		}

		w.Header().Set("Content-Type", contentType)
		w.Write(content)
	})

	// Применяем middleware
	handler := middleware.Logger(middleware.CORS(mux))

	// Запускаем сервер
	log.Printf("Server listening on :%s", cfg.Port)
	log.Println("✓ Admin panel: http://localhost:" + cfg.Port + "/")
	log.Println("✓ VK Mini App: http://localhost:" + cfg.Port + "/vk_app/")
	log.Println("✓ API: http://localhost:" + cfg.Port + "/api/")
	log.Println("✓ VK App API: http://localhost:" + cfg.Port + "/api/app/")
	log.Println("✓ Site API: http://localhost:" + cfg.Port + "/api/site/")

	if err := http.ListenAndServe(":"+cfg.Port, handler); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

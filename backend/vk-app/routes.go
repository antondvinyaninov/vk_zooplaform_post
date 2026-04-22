package vkapp

import (
	"backend/middleware"
	"net/http"
)

// RegisterRoutes регистрирует маршруты для VK Mini App
func RegisterRoutes(mux *http.ServeMux) {
	// API endpoints для VK Mini App
	mux.HandleFunc("/api/app/health", middleware.CORSFunc(healthHandler))

	// TODO: Добавить endpoints для работы с постами из Mini App
	// mux.HandleFunc("/api/app/posts/create", middleware.CORSFunc(createPostHandler))
	// mux.HandleFunc("/api/app/posts/list", middleware.CORSFunc(listPostsHandler))
}

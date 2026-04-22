package site

import (
	"backend/middleware"
	"net/http"
)

// RegisterRoutes регистрирует маршруты для основного сайта
func RegisterRoutes(mux *http.ServeMux) {
	// API endpoints для сайта
	mux.HandleFunc("/api/site/health", middleware.CORSFunc(healthHandler))

	// TODO: Добавить endpoints для основного сайта
	// mux.HandleFunc("/api/site/contact", middleware.CORSFunc(contactHandler))
	// mux.HandleFunc("/api/site/subscribe", middleware.CORSFunc(subscribeHandler))
}

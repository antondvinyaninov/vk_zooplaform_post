package vkapp

import (
	"backend/middleware"
	"net/http"
)

// RegisterRoutes регистрирует маршруты для VK Mini App
func RegisterRoutes(mux *http.ServeMux) {
	// API endpoints для VK Mini App
	mux.HandleFunc("/api/app/health", middleware.CORSFunc(healthHandler))
	mux.HandleFunc("/api/app/config", middleware.CORSFunc(configHandler))
	mux.HandleFunc("/api/app/users/me", middleware.CORSFunc(syncUserHandler))
	mux.HandleFunc("/api/app/posts", middleware.CORSFunc(postsHandler))
	mux.HandleFunc("/api/app/posts/video-upload-url", middleware.CORSFunc(videoUploadUrlHandler))
	mux.HandleFunc("/api/app/posts/my", middleware.CORSFunc(myPostsHandler))
	mux.HandleFunc("/api/app/posts/", middleware.CORSFunc(postByIDHandler))

	mux.HandleFunc("/api/app/groups/me", middleware.CORSFunc(groupSettingsHandler))
	mux.HandleFunc("/api/app/groups/me/managers", middleware.CORSFunc(groupManagersHandler))
	mux.HandleFunc("/api/app/groups/token", middleware.CORSFunc(saveGroupTokenHandler))
	mux.HandleFunc("/api/app/cities", middleware.CORSFunc(citiesHandler))
	mux.HandleFunc("/api/app/upload/video-presign", middleware.CORSFunc(s3VideoPresignHandler))

	// Webhook для получения событий от ВКонтакте
	mux.HandleFunc("/api/callback", callbackHandler)
}

package admin

import (
	"backend/middleware"
	"log"
	"net/http"
)

// RegisterRoutes регистрирует маршруты для админки
func RegisterRoutes(mux *http.ServeMux) {
	log.Printf("[Admin] Registering admin routes...")

	// API endpoints для админки
	mux.HandleFunc("/api/admin/health", middleware.CORSFunc(healthHandler))
	mux.HandleFunc("/api/admin/auth/login", middleware.CORSFunc(loginHandler))
	mux.HandleFunc("/api/admin/users", middleware.CORSFunc(usersHandler))
	mux.HandleFunc("/api/admin/users/", middleware.CORSFunc(userByIDHandler))
	mux.HandleFunc("/api/admin/groups/installed", middleware.CORSFunc(installedGroupsHandler))
	mux.HandleFunc("/api/admin/groups/health/refresh", middleware.CORSFunc(refreshGroupHealthHandler))
	mux.HandleFunc("/api/admin/dashboard/stats", middleware.CORSFunc(dashboardStatsHandler))
	mux.HandleFunc("/api/admin/vk/connection", middleware.CORSFunc(vkConnectionHandler))
	mux.HandleFunc("/api/settings/snippet", middleware.CORSFunc(snippetHandler))

	log.Printf("[Admin] Registering VK API routes...")
	// VK API endpoints (старые, для обратной совместимости)
	mux.HandleFunc("/api/vk/test", middleware.CORSFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("[VK] Test endpoint called from %s", r.RemoteAddr)
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","message":"VK API backend is working"}`))
	}))
	mux.HandleFunc("/api/vk/post", middleware.CORSFunc(vkPostHandler))
	mux.HandleFunc("/api/vk/posts", middleware.CORSFunc(vkGetPostsHandler))
	mux.HandleFunc("/api/vk/repost", middleware.CORSFunc(vkRepostHandler))
	mux.HandleFunc("/api/vk/copy-post", middleware.CORSFunc(vkCopyPostHandler))
	mux.HandleFunc("/api/vk/groups", middleware.CORSFunc(vkGetGroupsHandler))
	mux.HandleFunc("/api/vk/user-info", middleware.CORSFunc(vkUserInfoHandler))
	mux.HandleFunc("/api/vk/service-key", middleware.CORSFunc(vkServiceKeyHandler))
	mux.HandleFunc("/api/vk/oauth/callback", middleware.CORSFunc(vkOAuthCallbackHandler))
	mux.HandleFunc("/api/vk/oauth/token", middleware.CORSFunc(vkOAuthTokenHandler))

	log.Printf("[Admin] Registering redirect routes...")
	// Редиректы для обратной совместимости
	mux.HandleFunc("/auth.html", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/", http.StatusMovedPermanently)
	})
	mux.HandleFunc("/groups.html", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/pages/groups.html", http.StatusMovedPermanently)
	})
	mux.HandleFunc("/posts.html", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/pages/posts.html", http.StatusMovedPermanently)
	})

	log.Printf("[Admin] ✓ All admin routes registered")
}

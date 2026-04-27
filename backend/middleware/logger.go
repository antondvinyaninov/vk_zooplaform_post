package middleware

import (
	"log"
	"net/http"
	"time"
)

// Logger middleware для логирования запросов
func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Создаем ResponseWriter для захвата статус кода
		rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		next.ServeHTTP(rw, r)

		duration := time.Since(start)

		// Подробное логирование с эмодзи для легкого поиска
		if rw.statusCode >= 400 {
			log.Printf("❌ %s %s %d %s (from %s, UA: %s)",
				r.Method, r.RequestURI, rw.statusCode, duration, r.RemoteAddr, r.UserAgent())
		} else if r.RequestURI == "/health" || r.RequestURI == "/api/health" {
			log.Printf("🏥 %s %s %d %s", r.Method, r.RequestURI, rw.statusCode, duration)
		} else if isStaticAsset(r.RequestURI) {
			// Do not log static assets to avoid spam and improve performance
		} else {
			log.Printf("✅ %s %s %d %s (from %s)",
				r.Method, r.RequestURI, rw.statusCode, duration, r.RemoteAddr)
		}
	})
}

func isStaticAsset(uri string) bool {
	if len(uri) > 8 && uri[:8] == "/_astro/" {
		return true
	}
	if len(uri) > 8 && uri[:8] == "/assets/" {
		return true
	}
	if len(uri) > 15 && uri[:15] == "/vk_app/assets/" {
		return true
	}
	return false
}

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

package middleware

import (
	"log"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

// IP-based Rate Limiter configuration
const (
	rateLimit  = 1.0 // 1 request per second (60 per minute)
	burstLimit = 30  // Allow short bursts up to 30 requests
)

var (
	visitors = make(map[string]*visitor)
	mu       sync.Mutex
)

// visitor represents a single IP address and its rate limiter
type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// init starts a background goroutine to clean up old visitors from the map
func init() {
	go cleanupVisitors()
}

// getVisitor returns the rate limiter for the given IP address
func getVisitor(ip string) *rate.Limiter {
	mu.Lock()
	defer mu.Unlock()

	v, exists := visitors[ip]
	if !exists {
		limiter := rate.NewLimiter(rateLimit, burstLimit)
		visitors[ip] = &visitor{limiter, time.Now()}
		return limiter
	}

	v.lastSeen = time.Now()
	return v.limiter
}

// cleanupVisitors runs every minute and removes visitors unseen for > 3 minutes
func cleanupVisitors() {
	for {
		time.Sleep(time.Minute)
		mu.Lock()
		for ip, v := range visitors {
			if time.Since(v.lastSeen) > 3*time.Minute {
				delete(visitors, ip)
			}
		}
		mu.Unlock()
	}
}

// getIP extracts the real IP address from the request
func getIP(r *http.Request) string {
	// 1. Check for real IP from proxy (EasyPanel / Traefik usually sets this)
	forwarded := r.Header.Get("X-Forwarded-For")
	if forwarded != "" {
		return forwarded
	}

	realIP := r.Header.Get("X-Real-IP")
	if realIP != "" {
		return realIP
	}

	// 2. Fallback to direct RemoteAddr
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}

// RateLimit is a middleware that enforces request limits per IP address
func RateLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Bypass rate limiting for frontend static assets
		if !strings.HasPrefix(r.URL.Path, "/api/") {
			next.ServeHTTP(w, r)
			return
		}

		ip := getIP(r)
		limiter := getVisitor(ip)

		// Check if the request is allowed
		if !limiter.Allow() {
			log.Printf("⚠️  [RateLimit] IP %s hit limit. Blocking request: %s %s", ip, r.Method, r.URL.Path)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			w.Write([]byte(`{"error": "Too Many Requests - Please try again later"}`))
			return
		}

		// Proceed with the request
		next.ServeHTTP(w, r)
	})
}

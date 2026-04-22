package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port           string
	VKServiceKey   string
	VKClientID     string
	VKClientSecret string
	DatabasePath   string
}

// Load загружает конфигурацию из переменных окружения
func Load() *Config {
	return &Config{
		Port:           getEnv("PORT", "80"),
		VKServiceKey:   getEnv("VK_SERVICE_KEY", ""),
		VKClientID:     getEnv("VK_CLIENT_ID", "54555042"),
		VKClientSecret: getEnv("VK_CLIENT_SECRET", "488uLwXVh0NbUFcrJIvA"),
		DatabasePath:   getEnv("DATABASE_PATH", "./data/app.db"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

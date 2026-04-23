package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port         string
	VKServiceKey string

	// VK Standalone App (для постинга через API)
	VKClientID     string
	VKClientSecret string

	// VK Mini App (для мини-приложения в сообществе)
	VKMiniAppID         string
	VKMiniAppSecret     string
	VKMiniAppServiceKey string

	DatabasePath string
}

// Load загружает конфигурацию из переменных окружения
func Load() *Config {
	return &Config{
		Port:         getEnv("PORT", "8000"),
		VKServiceKey: getEnv("VK_SERVICE_KEY", ""),

		// VK Standalone App (для постинга)
		VKClientID:     getEnv("VK_CLIENT_ID", "54555042"),
		VKClientSecret: getEnv("VK_CLIENT_SECRET", "488uLwXVh0NbUFcrJIvA"),

		// VK Mini App (для мини-приложения)
		VKMiniAppID:         getEnv("VK_MINI_APP_ID", "54490430"),
		VKMiniAppSecret:     getEnv("VK_MINI_APP_SECRET", "Rv2kFUEMsePsD0vm5Pgg"),
		VKMiniAppServiceKey: getEnv("VK_MINI_APP_SERVICE_KEY", "a46dd01aa46dd01aa46dd01a51a72da1b8aa46da46dd01acd8bfbaef10dfc86482dd644"),

		DatabasePath: getEnv("DATABASE_PATH", "./data/app.db"),
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

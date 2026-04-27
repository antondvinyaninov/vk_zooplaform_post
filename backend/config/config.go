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

	VKOfficialGroupToken string
	VKOfficialGroupID    int

	DatabaseURL  string
}

// Load загружает конфигурацию из переменных окружения
func Load() *Config {
	return &Config{
		Port:         getEnv("PORT", "80"), // По умолчанию порт 80
		VKServiceKey: getEnv("VK_SERVICE_KEY", "a5b5b6aaa5b5b6aaa5b5b6aa3ca68ae59aaa5b5a5b5b6aacc52bb65014d8826cb301184"),

		// VK Standalone App (для постинга)
		VKClientID:     getEnv("VK_CLIENT_ID", "54481712"),
		VKClientSecret: getEnv("VK_CLIENT_SECRET", "488uLwXVh0NbUFcrJIvA"),

		// VK Mini App (для мини-приложения)
		VKMiniAppID:         getEnv("VK_MINI_APP_ID", "54560047"),
		VKMiniAppSecret:     getEnv("VK_MINI_APP_SECRET", "kI41QDPyyK87kIopZ2U9"),
		VKMiniAppServiceKey: getEnv("VK_MINI_APP_SERVICE_KEY", "e59b585ae59b585ae59b585a67e6dbdd75ee59be59b585a8c7299470181bb987c8b3c03"),

		VKOfficialGroupToken: getEnv("VK_OFFICIAL_GROUP_TOKEN", ""),
		VKOfficialGroupID:    getEnvInt("VK_OFFICIAL_GROUP_ID", 165434330),

		DatabaseURL:  getEnv("DATABASE_URL", "postgres://dvinyaninov_pet:ps8uGNxn0uVf0VK23@155.212.168.69:5596/vkpet?sslmode=disable"),
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

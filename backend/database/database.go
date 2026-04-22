package database

import (
	"database/sql"
	"log"
	"os"
	"path/filepath"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

// Init инициализирует подключение к базе данных
func Init(dbPath string) error {
	// Создаем директорию для БД если не существует
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	// Открываем подключение
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return err
	}

	// Проверяем подключение
	if err := db.Ping(); err != nil {
		return err
	}

	DB = db
	log.Printf("Database connected: %s", dbPath)

	// Создаем таблицы
	if err := createTables(); err != nil {
		return err
	}

	return nil
}

// createTables создает необходимые таблицы
func createTables() error {
	schema := `
	CREATE TABLE IF NOT EXISTS groups (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		vk_group_id INTEGER UNIQUE NOT NULL,
		name TEXT NOT NULL,
		screen_name TEXT,
		photo_200 TEXT,
		access_token TEXT,
		is_active BOOLEAN DEFAULT 1,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS posts (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		vk_post_id INTEGER,
		group_id INTEGER,
		message TEXT,
		attachments TEXT,
		status TEXT DEFAULT 'draft',
		publish_date DATETIME,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (group_id) REFERENCES groups(id)
	);

	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		vk_user_id INTEGER UNIQUE NOT NULL,
		first_name TEXT,
		last_name TEXT,
		photo_200 TEXT,
		role TEXT DEFAULT 'user',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_groups_vk_id ON groups(vk_group_id);
	CREATE INDEX IF NOT EXISTS idx_posts_group_id ON posts(group_id);
	CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
	CREATE INDEX IF NOT EXISTS idx_users_vk_id ON users(vk_user_id);
	`

	_, err := DB.Exec(schema)
	if err != nil {
		return err
	}

	log.Println("Database tables created successfully")
	return nil
}

// Close закрывает подключение к базе данных
func Close() error {
	if DB != nil {
		return DB.Close()
	}
	return nil
}

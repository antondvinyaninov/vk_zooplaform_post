package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

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
		health_status TEXT DEFAULT 'unknown',
		last_check_at DATETIME,
		health_error TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS posts (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		vk_post_id INTEGER,
		user_id INTEGER,
		group_id INTEGER,
		message TEXT,
		attachments TEXT,
		status TEXT DEFAULT 'draft',
		publish_date DATETIME,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id),
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

	CREATE TABLE IF NOT EXISTS admin_users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT UNIQUE NOT NULL,
		password TEXT NOT NULL,
		display_name TEXT NOT NULL,
		role TEXT NOT NULL DEFAULT 'user',
		status TEXT NOT NULL DEFAULT 'active',
		avatar_url TEXT,
		last_login DATETIME,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS vk_connection (
		id INTEGER PRIMARY KEY CHECK (id = 1),
		access_token TEXT,
		vk_user_id INTEGER,
		user_name TEXT,
		user_photo TEXT,
		token_expires INTEGER,
		is_connected BOOLEAN DEFAULT 0,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS vk_accounts (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		vk_user_id INTEGER,
		user_name TEXT,
		user_photo TEXT,
		access_token TEXT NOT NULL,
		token_expires INTEGER,
		is_active BOOLEAN DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_groups_vk_id ON groups(vk_group_id);
	CREATE INDEX IF NOT EXISTS idx_posts_group_id ON posts(group_id);
	CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
	CREATE INDEX IF NOT EXISTS idx_users_vk_id ON users(vk_user_id);
	CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
	CREATE INDEX IF NOT EXISTS idx_vk_accounts_user_id ON vk_accounts(vk_user_id);
	CREATE INDEX IF NOT EXISTS idx_vk_accounts_active ON vk_accounts(is_active);
	`

	_, err := DB.Exec(schema)
	if err != nil {
		return err
	}

	if err := migratePostsTable(); err != nil {
		return err
	}

	if err := seedAdminUsers(); err != nil {
		return err
	}

	if err := seedVKConnectionRow(); err != nil {
		return err
	}

	if err := migrateVKAccountsFromLegacy(); err != nil {
		return err
	}

	log.Println("Database tables created successfully")
	return nil
}

func migratePostsTable() error {
	if err := addColumnIfMissing("groups", "health_status", "TEXT DEFAULT 'unknown'"); err != nil {
		return err
	}
	if err := addColumnIfMissing("groups", "last_check_at", "DATETIME"); err != nil {
		return err
	}
	if err := addColumnIfMissing("groups", "health_error", "TEXT"); err != nil {
		return err
	}

	if err := addColumnIfMissing("posts", "user_id", "INTEGER"); err != nil {
		return err
	}

	if _, err := DB.Exec(`CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)`); err != nil {
		return err
	}

	return nil
}

func addColumnIfMissing(tableName, columnName, definition string) error {
	rows, err := DB.Query(fmt.Sprintf("PRAGMA table_info(%s)", tableName))
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var (
			cid        int
			name       string
			columnType string
			notNull    int
			defaultVal sql.NullString
			pk         int
		)

		if err := rows.Scan(&cid, &name, &columnType, &notNull, &defaultVal, &pk); err != nil {
			return err
		}

		if strings.EqualFold(name, columnName) {
			return nil
		}
	}

	_, err = DB.Exec(fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", tableName, columnName, definition))
	return err
}

func seedAdminUsers() error {
	seedQuery := `
	INSERT OR IGNORE INTO admin_users (username, password, display_name, role, status)
	VALUES
		('admin', 'admin123', 'Администратор', 'admin', 'active'),
		('user', 'user123', 'Пользователь', 'user', 'active'),
		('moderator', 'mod123', 'Модератор', 'moderator', 'active')
	`

	_, err := DB.Exec(seedQuery)
	return err
}

func seedVKConnectionRow() error {
	_, err := DB.Exec(`
		INSERT OR IGNORE INTO vk_connection (id, is_connected)
		VALUES (1, 0)
	`)
	return err
}

func migrateVKAccountsFromLegacy() error {
	if !tableExists("vk_connection") || !tableExists("vk_accounts") {
		return nil
	}

	if _, err := DB.Exec(`
		INSERT INTO vk_accounts (vk_user_id, user_name, user_photo, access_token, token_expires, is_active, created_at, updated_at)
		SELECT
			vk_user_id,
			COALESCE(user_name, ''),
			COALESCE(user_photo, ''),
			access_token,
			token_expires,
			CASE WHEN is_connected = 1 THEN 1 ELSE 0 END,
			CURRENT_TIMESTAMP,
			COALESCE(updated_at, CURRENT_TIMESTAMP)
		FROM vk_connection
		WHERE TRIM(COALESCE(access_token, '')) <> ''
		  AND NOT EXISTS (
			  SELECT 1 FROM vk_accounts acc
			  WHERE acc.vk_user_id = vk_connection.vk_user_id
			    AND vk_connection.vk_user_id IS NOT NULL
		  )
	`); err != nil {
		return err
	}

	var activeCount int
	if err := DB.QueryRow(`SELECT COUNT(1) FROM vk_accounts WHERE is_active = 1`).Scan(&activeCount); err != nil {
		return err
	}

	if activeCount == 0 {
		if _, err := DB.Exec(`
			UPDATE vk_accounts
			SET is_active = 1, updated_at = CURRENT_TIMESTAMP
			WHERE id = (
				SELECT id
				FROM vk_accounts
				WHERE TRIM(COALESCE(access_token, '')) <> ''
				ORDER BY updated_at DESC, id DESC
				LIMIT 1
			)
		`); err != nil {
			return err
		}
	}

	return nil
}

func tableExists(tableName string) bool {
	var count int
	err := DB.QueryRow(`
		SELECT COUNT(1)
		FROM sqlite_master
		WHERE type = 'table' AND name = ?
	`, tableName).Scan(&count)
	return err == nil && count > 0
}

// Close закрывает подключение к базе данных
func Close() error {
	if DB != nil {
		return DB.Close()
	}
	return nil
}

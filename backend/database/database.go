package database

import (
	"context"
	"database/sql"
	"strings"

	"fmt"
	"log"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

var DB *sql.DB

// Init инициализирует подключение к базе данных
func Init(dbURL string) error {
	dsn := strings.TrimSpace(dbURL)
	if dsn == "" {
		return fmt.Errorf("DATABASE_URL is required for PostgreSQL connection")
	}

	// Открываем подключение
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return err
	}

	// Проверяем подключение с таймаутом
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return fmt.Errorf("database connection failed: %v", err)
	}

	DB = db
	log.Printf("Database connected (pgx)")

	// Создаем таблицы
	if err := createTables(); err != nil {
		return err
	}

	return nil
}

// createTables создает необходимые таблицы
func createTables() error {
	_, err := DB.Exec(postgresSchema)
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

const postgresSchema = `
	CREATE TABLE IF NOT EXISTS groups (
		id BIGSERIAL PRIMARY KEY,
		vk_group_id BIGINT UNIQUE NOT NULL,
		name TEXT NOT NULL,
		screen_name TEXT,
		photo_200 TEXT,
		city_id BIGINT,
		city_title TEXT,
		access_token TEXT,
		is_active BOOLEAN DEFAULT TRUE,
		health_status TEXT DEFAULT 'unknown',
		last_check_at TIMESTAMPTZ,
		health_error TEXT,
		members_count INTEGER DEFAULT 0,
		notify_user_ids TEXT DEFAULT '[]',
		created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS users (
		id BIGSERIAL PRIMARY KEY,
		vk_user_id BIGINT UNIQUE NOT NULL,
		first_name TEXT,
		last_name TEXT,
		photo_200 TEXT,
		role TEXT DEFAULT 'user',
		created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS posts (
		id BIGSERIAL PRIMARY KEY,
		vk_post_id BIGINT,
		user_id BIGINT,
		group_id BIGINT,
		message TEXT,
		attachments TEXT,
		status TEXT DEFAULT 'draft',
		publish_date TIMESTAMPTZ,
		created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id),
		FOREIGN KEY (group_id) REFERENCES groups(id)
	);

	CREATE TABLE IF NOT EXISTS admin_users (
		id BIGSERIAL PRIMARY KEY,
		username TEXT UNIQUE NOT NULL,
		password TEXT NOT NULL,
		display_name TEXT NOT NULL,
		role TEXT NOT NULL DEFAULT 'user',
		status TEXT NOT NULL DEFAULT 'active',
		avatar_url TEXT,
		last_login TIMESTAMPTZ,
		created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS vk_connection (
		id INTEGER PRIMARY KEY,
		access_token TEXT,
		vk_user_id BIGINT,
		user_name TEXT,
		user_photo TEXT,
		token_expires BIGINT,
		is_connected BOOLEAN DEFAULT FALSE,
		updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS vk_accounts (
		id BIGSERIAL PRIMARY KEY,
		vk_user_id BIGINT,
		user_name TEXT,
		user_photo TEXT,
		access_token TEXT NOT NULL,
		token_expires BIGINT,
		is_active BOOLEAN DEFAULT FALSE,
		created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_groups_vk_id ON groups(vk_group_id);
	CREATE INDEX IF NOT EXISTS idx_posts_group_id ON posts(group_id);
	CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
	CREATE INDEX IF NOT EXISTS idx_users_vk_id ON users(vk_user_id);
	CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
	CREATE INDEX IF NOT EXISTS idx_vk_accounts_user_id ON vk_accounts(vk_user_id);
	CREATE INDEX IF NOT EXISTS idx_vk_accounts_active ON vk_accounts(is_active);

	CREATE TABLE IF NOT EXISTS group_stats_history (
		id BIGSERIAL PRIMARY KEY,
		date TEXT NOT NULL UNIQUE,
		total_groups INTEGER NOT NULL DEFAULT 0,
		total_subscribers INTEGER NOT NULL DEFAULT 0,
		created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
	);
`

func migratePostsTable() error {
	if err := addColumnIfMissing("groups", "health_status", "TEXT DEFAULT 'unknown'"); err != nil {
		return err
	}
	if err := addColumnIfMissing("groups", "last_check_at", "TIMESTAMPTZ"); err != nil {
		return err
	}
	if err := addColumnIfMissing("groups", "health_error", "TEXT"); err != nil {
		return err
	}
	if err := addColumnIfMissing("posts", "user_id", "BIGINT"); err != nil {
		return err
	}
	if err := addColumnIfMissing("groups", "members_count", "INTEGER DEFAULT 0"); err != nil {
		return err
	}
	if err := addColumnIfMissing("groups", "notify_user_ids", "TEXT DEFAULT '[]'"); err != nil {
		return err
	}
	if err := addColumnIfMissing("groups", "city_id", "BIGINT"); err != nil {
		return err
	}
	if err := addColumnIfMissing("groups", "city_title", "TEXT"); err != nil {
		return err
	}
	if _, err := DB.Exec(`CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)`); err != nil {
		return err
	}
	return nil
}

func addColumnIfMissing(tableName, columnName, definition string) error {
	var count int
	if err := QueryRow(`
		SELECT COUNT(1)
		FROM information_schema.columns
		WHERE table_schema = current_schema()
		  AND table_name = $1
		  AND column_name = $2
	`, tableName, columnName).Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	_, err := DB.Exec(fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", tableName, columnName, definition))
	return err
}

func seedAdminUsers() error {
	seedQuery := `
	INSERT INTO admin_users (username, password, display_name, role, status)
	VALUES
		('admin', 'admin123', 'Администратор', 'admin', 'active'),
		('user', 'user123', 'Пользователь', 'user', 'active'),
		('moderator', 'mod123', 'Модератор', 'moderator', 'active')
	ON CONFLICT (username) DO NOTHING
	`
	_, err := DB.Exec(seedQuery)
	return err
}

func seedVKConnectionRow() error {
	query := `
		INSERT INTO vk_connection (id, is_connected)
		VALUES (1, FALSE)
		ON CONFLICT (id) DO NOTHING`
	_, err := DB.Exec(query)
	return err
}

func migrateVKAccountsFromLegacy() error {
	if !tableExists("vk_connection") || !tableExists("vk_accounts") {
		return nil
	}

	migrateQuery := `
		INSERT INTO vk_accounts (vk_user_id, user_name, user_photo, access_token, token_expires, is_active, created_at, updated_at)
		SELECT
			vk_user_id,
			COALESCE(user_name, ''),
			COALESCE(user_photo, ''),
			access_token,
			token_expires,
			CASE WHEN is_connected = TRUE THEN TRUE ELSE FALSE END,
			CURRENT_TIMESTAMP,
			COALESCE(updated_at, CURRENT_TIMESTAMP)
		FROM vk_connection
		WHERE TRIM(COALESCE(access_token, '')) <> ''
		  AND NOT EXISTS (
			  SELECT 1 FROM vk_accounts acc
			  WHERE acc.vk_user_id = vk_connection.vk_user_id
			    AND vk_connection.vk_user_id IS NOT NULL
		  )`

	if _, err := DB.Exec(migrateQuery); err != nil {
		return err
	}

	var activeCount int
	if err := DB.QueryRow(`SELECT COUNT(1) FROM vk_accounts WHERE is_active = TRUE`).Scan(&activeCount); err != nil {
		return err
	}

	if activeCount == 0 {
		if _, err := DB.Exec(`
			UPDATE vk_accounts
			SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP
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
	query := `SELECT COUNT(1) FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = $1`
	err := QueryRow(query, tableName).Scan(&count)
	return err == nil && count > 0
}

// Close закрывает подключение к базе данных
func Close() error {
	if DB != nil {
		return DB.Close()
	}
	return nil
}

func rebind(query string) string {
	var b strings.Builder
	b.Grow(len(query) + 16)
	idx := 1
	for i := 0; i < len(query); i++ {
		if query[i] == '?' {
			b.WriteString(fmt.Sprintf("$%d", idx))
			idx++
		} else {
			b.WriteByte(query[i])
		}
	}
	return b.String()
}

func Rebind(query string) string {
	return rebind(query)
}

func Exec(query string, args ...interface{}) (sql.Result, error) {
	return DB.Exec(rebind(query), args...)
}

func Query(query string, args ...interface{}) (*sql.Rows, error) {
	return DB.Query(rebind(query), args...)
}

func QueryRow(query string, args ...interface{}) *sql.Row {
	return DB.QueryRow(rebind(query), args...)
}

func Begin() (*sql.Tx, error) {
	return DB.Begin()
}

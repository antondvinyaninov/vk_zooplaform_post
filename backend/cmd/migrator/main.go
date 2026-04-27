package main

import (
	"database/sql"
	"log"

	_ "github.com/jackc/pgx/v5/stdlib"
	_ "github.com/mattn/go-sqlite3"
)

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

	CREATE TABLE IF NOT EXISTS group_stats_history (
		id BIGSERIAL PRIMARY KEY,
		date TEXT NOT NULL,
		total_groups INTEGER NOT NULL DEFAULT 0,
		total_subscribers INTEGER NOT NULL DEFAULT 0,
		created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(date)
	);
`

func main() {
	log.Println("Starting migration...")

	// Open SQLite
	sqliteDb, err := sql.Open("sqlite3", "../../data/app.db")
	if err != nil {
		log.Fatalf("Failed to open SQLite: %v", err)
	}
	defer sqliteDb.Close()

	// Open Postgres
	pgUrl := "postgres://dvinyaninov_pet:ps8uGNxn0uVf0VK23@155.212.168.69:5596/vkpet?sslmode=disable"
	pgDb, err := sql.Open("pgx", pgUrl)
	if err != nil {
		log.Fatalf("Failed to open Postgres: %v", err)
	}
	defer pgDb.Close()

	if err := pgDb.Ping(); err != nil {
		log.Fatalf("Failed to ping Postgres: %v", err)
	}
	log.Println("Connected to Postgres successfully.")

	// Create tables in PG
	if _, err := pgDb.Exec(postgresSchema); err != nil {
		log.Fatalf("Failed to create tables in PG: %v", err)
	}
	log.Println("Postgres tables verified.")

	// Helper to handle strings/nulls
	nullStr := func(val interface{}) interface{} {
		if val == nil {
			return nil
		}
		if s, ok := val.([]byte); ok {
			return string(s)
		}
		return val
	}

	// 1. Migrate Admin Users
	log.Println("Migrating admin_users...")
	rows, err := sqliteDb.Query("SELECT id, username, password, display_name, role, status, avatar_url, last_login, created_at, updated_at FROM admin_users")
	if err != nil {
		log.Fatal(err)
	}
	for rows.Next() {
		var id int
		var username, password, displayName, role, status string
		var avatarUrl, lastLogin, createdAt, updatedAt interface{}
		err = rows.Scan(&id, &username, &password, &displayName, &role, &status, &avatarUrl, &lastLogin, &createdAt, &updatedAt)
		if err != nil {
			log.Fatal(err)
		}
		_, err = pgDb.Exec("INSERT INTO admin_users (id, username, password, display_name, role, status, avatar_url, last_login, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT DO NOTHING",
			id, username, password, displayName, role, status, nullStr(avatarUrl), lastLogin, createdAt, updatedAt)
		if err != nil {
			log.Printf("Error inserting admin_user %s: %v", username, err)
		}
	}
	rows.Close()
	pgDb.Exec("SELECT setval('admin_users_id_seq', (SELECT MAX(id) FROM admin_users));")

	// 2. Migrate VK Connection
	log.Println("Migrating vk_connection...")
	rows, err = sqliteDb.Query("SELECT id, access_token, vk_user_id, user_name, user_photo, token_expires, is_connected, updated_at FROM vk_connection")
	if err != nil {
		log.Fatal(err)
	}
	for rows.Next() {
		var id int
		var accessToken, userName, userPhoto interface{}
		var vkUserId, tokenExpires interface{}
		var isConnected interface{} // SQLite uses 0/1
		var updatedAt interface{}
		err = rows.Scan(&id, &accessToken, &vkUserId, &userName, &userPhoto, &tokenExpires, &isConnected, &updatedAt)
		if err != nil {
			log.Fatal(err)
		}
		
		isConnBool := false
		if isConnected != nil {
			if v, ok := isConnected.(int64); ok && v == 1 {
				isConnBool = true
			}
		}

		_, err = pgDb.Exec("INSERT INTO vk_connection (id, access_token, vk_user_id, user_name, user_photo, token_expires, is_connected, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO UPDATE SET access_token = EXCLUDED.access_token",
			id, nullStr(accessToken), vkUserId, nullStr(userName), nullStr(userPhoto), tokenExpires, isConnBool, updatedAt)
		if err != nil {
			log.Printf("Error inserting vk_connection: %v", err)
		}
	}
	rows.Close()

	// 3. Migrate VK Accounts
	log.Println("Migrating vk_accounts...")
	rows, err = sqliteDb.Query("SELECT id, vk_user_id, user_name, user_photo, access_token, token_expires, is_active, created_at, updated_at FROM vk_accounts")
	if err != nil {
		log.Fatal(err)
	}
	for rows.Next() {
		var id int
		var vkUserId, tokenExpires interface{}
		var userName, userPhoto, accessToken interface{}
		var isActive interface{}
		var createdAt, updatedAt interface{}
		err = rows.Scan(&id, &vkUserId, &userName, &userPhoto, &accessToken, &tokenExpires, &isActive, &createdAt, &updatedAt)
		if err != nil {
			log.Fatal(err)
		}

		isActiveBool := false
		if isActive != nil {
			if v, ok := isActive.(int64); ok && v == 1 {
				isActiveBool = true
			}
		}

		_, err = pgDb.Exec("INSERT INTO vk_accounts (id, vk_user_id, user_name, user_photo, access_token, token_expires, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING",
			id, vkUserId, nullStr(userName), nullStr(userPhoto), nullStr(accessToken), tokenExpires, isActiveBool, createdAt, updatedAt)
		if err != nil {
			log.Printf("Error inserting vk_accounts: %v", err)
		}
	}
	rows.Close()
	pgDb.Exec("SELECT setval('vk_accounts_id_seq', (SELECT MAX(id) FROM vk_accounts));")

	// 4. Migrate Groups
	log.Println("Migrating groups...")
	rows, err = sqliteDb.Query("SELECT id, vk_group_id, name, screen_name, photo_200, city_id, city_title, access_token, is_active, health_status, last_check_at, health_error, members_count, notify_user_ids, created_at, updated_at FROM groups")
	if err != nil {
		log.Fatal(err)
	}
	for rows.Next() {
		var id, vkGroupId int
		var name string
		var screenName, photo200, cityTitle, accessToken, healthStatus, healthError, notifyUserIds interface{}
		var cityId, membersCount interface{}
		var isActive interface{}
		var lastCheckAt, createdAt, updatedAt interface{}
		err = rows.Scan(&id, &vkGroupId, &name, &screenName, &photo200, &cityId, &cityTitle, &accessToken, &isActive, &healthStatus, &lastCheckAt, &healthError, &membersCount, &notifyUserIds, &createdAt, &updatedAt)
		if err != nil {
			log.Fatal(err)
		}

		isActiveBool := true
		if isActive != nil {
			if v, ok := isActive.(int64); ok && v == 0 {
				isActiveBool = false
			}
		}

		// Fix dates
		if s, ok := lastCheckAt.([]byte); ok && string(s) == "" { lastCheckAt = nil }

		_, err = pgDb.Exec("INSERT INTO groups (id, vk_group_id, name, screen_name, photo_200, city_id, city_title, access_token, is_active, health_status, last_check_at, health_error, members_count, notify_user_ids, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) ON CONFLICT (vk_group_id) DO NOTHING",
			id, vkGroupId, name, nullStr(screenName), nullStr(photo200), cityId, nullStr(cityTitle), nullStr(accessToken), isActiveBool, nullStr(healthStatus), lastCheckAt, nullStr(healthError), membersCount, nullStr(notifyUserIds), createdAt, updatedAt)
		if err != nil {
			log.Printf("Error inserting group %d: %v", vkGroupId, err)
		}
	}
	rows.Close()
	pgDb.Exec("SELECT setval('groups_id_seq', (SELECT MAX(id) FROM groups));")

	// 5. Migrate Stats
	log.Println("Migrating group_stats_history...")
	rows, err = sqliteDb.Query("SELECT id, date, total_groups, total_subscribers, created_at FROM group_stats_history")
	if err != nil {
		log.Printf("Stats error: %v", err)
	} else {
		for rows.Next() {
			var id, totalGroups, totalSubscribers int
			var date string
			var createdAt interface{}
			err = rows.Scan(&id, &date, &totalGroups, &totalSubscribers, &createdAt)
			if err != nil {
				log.Fatal(err)
			}
			_, err = pgDb.Exec("INSERT INTO group_stats_history (id, date, total_groups, total_subscribers, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (date) DO NOTHING",
				id, date, totalGroups, totalSubscribers, createdAt)
			if err != nil {
				log.Printf("Error inserting stats %s: %v", date, err)
			}
		}
		rows.Close()
		pgDb.Exec("SELECT setval('group_stats_history_id_seq', (SELECT MAX(id) FROM group_stats_history));")
	}

	log.Println("Migration completed successfully!")
}

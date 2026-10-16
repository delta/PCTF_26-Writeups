package app

import (
	"database/sql"
	"log"
)

const adminUsername = "admin"

func initDB(db *sql.DB) {
	db.Exec(`CREATE TABLE IF NOT EXISTS sessions (
		session_id TEXT PRIMARY KEY,
		username TEXT NOT NULL
	)`)

	db.Exec(`CREATE TABLE IF NOT EXISTS users (
		username TEXT PRIMARY KEY,
		password TEXT NOT NULL
	)`)

	db.Exec(`CREATE TABLE IF NOT EXISTS blogs (
		blog_id TEXT PRIMARY KEY,
		owner TEXT NOT NULL,
		content TEXT NOT NULL,
		is_published INTEGER DEFAULT 0,
		timestamp INTEGER
	)`)

	db.Exec(`CREATE TABLE IF NOT EXISTS reviews (
		id TEXT PRIMARY KEY,
		blog_id TEXT,
		text TEXT,
		timestamp INTEGER
	)`)
}

func bootstrapAdmin(db *sql.DB, cfg *Config) {
	db.Exec(
		"INSERT OR IGNORE INTO users VALUES (?, ?)",
		adminUsername,
		cfg.AdminSessionID,
	)

	db.Exec(
		"INSERT OR REPLACE INTO sessions VALUES (?, ?)",
		cfg.AdminSessionID,
		adminUsername,
	)

	var count int
	db.QueryRow(
		"SELECT COUNT(*) FROM blogs WHERE owner=?",
		adminUsername,
	).Scan(&count)

	if count > 0 {
		return
	}

	blogs := []struct {
		id        string
		content   string
		timestamp int64
	}{
		{
			id: "b3919dba-c247-456f-9543-aae9cfe34d53",
			content: "How we outperform others?\nOur front proxy reuses connection for better performance and latency",
			timestamp: 1767420234716,
		},
		{
			id: "2d82ed31-84d2-42c3-8929-553067f4ea05",
			content: "How are we fast?\nThis platform is optimized with a custom caching proxy.",
			timestamp: 1767333865254,
		},
		{
			id: "c2e38584-480c-4397-9776-9ceabcfd4e06",
			content: "About Moderation\nAll blogs are reviewed by our mod team on demand by the user.",
			timestamp: 1767161094180,
		},
	}

	for _, b := range blogs {
		_, err := db.Exec(
			"INSERT INTO blogs VALUES (?, ?, ?, 1, ?)",
			b.id,
			adminUsername,
			b.content,
			b.timestamp,
		)
		if err != nil {
			log.Fatal(err)
		}
	}
}

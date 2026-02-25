package app

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	_ "github.com/glebarez/go-sqlite"
)

type App struct {
	DB            *sql.DB
	Config        *Config
	Client        *http.Client
	OfficialBlogs string
}

func NewApp(cfg *Config) (*App, error) {
	db, err := sql.Open("sqlite", "./db/app")
	if err != nil {
		return nil, err
	}

	app := &App{
		DB:            db,
		Config:        cfg,
		Client:        &http.Client{Timeout: 5 * time.Second},
	}

	initDB(db)
	bootstrapAdmin(db, cfg)

	app.OfficialBlogs = buildLatestBlogs(db)

	return app, nil
}

func (a *App) ListenAndServe() error {
	mux := http.NewServeMux()

	mux.HandleFunc("/", a.homepage)
	mux.HandleFunc("/register", a.register)
	mux.HandleFunc("/login", a.login)
	mux.HandleFunc("/logout", a.logout)
	mux.HandleFunc("/my-blogs", a.myBlogs)
	mux.HandleFunc("/my-blogs/create", a.createBlog)
	mux.HandleFunc("/my-blogs/", a.myBlogHandler)
	mux.HandleFunc("/blogs/", a.publicBlog)
	mux.HandleFunc("/admin/blogs/", a.adminPublicBlog)
	mux.HandleFunc("/flag", a.adminFlag)

	return http.ListenAndServe(a.Config.ListenAddr, mux)
}

func buildLatestBlogs(db *sql.DB) string {
	rows, err := db.Query(`
		SELECT blog_id, content
		FROM blogs
		WHERE owner = ? AND is_published = 1
		ORDER BY blog_id DESC
	`, adminUsername)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	var b strings.Builder
	b.WriteString("<h2>Latest Blogs</h2><ul>")
	for rows.Next() {
		var id, content string
		rows.Scan(&id, &content)
		title := strings.SplitN(content, "\n", 2)[0]
		b.WriteString(fmt.Sprintf(
			`<li><a href="/blogs/%s">%s</a></li>`,
			id, title,
		))
	}
	b.WriteString("</ul>")
	return b.String()
}

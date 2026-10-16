package app

import (
	"fmt"
	"html"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

func (a *App) myBlogs(w http.ResponseWriter, r *http.Request) {
	s := a.getSession(r)
	if s == nil {
		http.Redirect(w, r, "/login", 303)
		return
	}

	rows, err := a.DB.Query(
		"SELECT blog_id, content, is_published, timestamp FROM blogs WHERE owner=?",
		s.Username,
	)
	if err != nil {
		http.Error(w, "db error", 500)
		return
	}
	defer rows.Close()

	body := ""
	body += `<h2>My Blogs</h2>`
	body += `<a href="/my-blogs/create">Create new</a><br><br>`
	body += `<ul>`

	for rows.Next() {
		var id, content string
		var pub, timestamp int64
		err = rows.Scan(&id, &content, &pub, &timestamp)
		if err := rows.Err(); err != nil {
    	log.Println("rows error:", err)
		}
		runes := []rune(content)
		title := string(runes)
		if len(runes) > 20 {
			title = string(runes[:20])
		}
		if len(title) > 20 {
			title = title[:16] + "..."
		}
		body += fmt.Sprintf(`<li><a href="/my-blogs/%s">%s: %s</a></li>`, id, time.UnixMilli(timestamp).String()[0:19]+" UTC", title)
	}

	body += `</ul>`

	a.renderPage(r, w, "My Blogs", body, false)
}

func (a *App) createBlog(w http.ResponseWriter, r *http.Request) {
	s := a.getSession(r)
	if s == nil {
		http.Redirect(w, r, "/login", 303)
		return
	}

	if r.Method == "GET" {
		a.renderPage(r, w, "Create Blog", `
<h2>Write New blog</h2>

<form method="POST">
  <textarea name="content" placeholder="Enter your blog content here"></textarea><br/>
  <input type="submit"><br/>
</form>`, false)
		return
	}

	if r.Header.Get("Content-Type") != "application/x-www-form-urlencoded" {
		http.Error(w, "bad content type", 400)
		return
	}

	r.ParseForm()

	content := r.FormValue("content")

	if len(content) < 20 || len(content) > 256 {
		http.Error(w, "content has to be between 20 and 256 characters", 400)
		return
	}

	a.DB.Exec(
		"INSERT INTO blogs VALUES (?, ?, ?, 0, ?)",
		uuid.New().String(),
		s.Username,
		url.QueryEscape(html.EscapeString(content)),
		time.Now().UnixMilli(),
	)

	http.Redirect(w, r, "/my-blogs", 303)
}

func (a *App) myBlogHandler(w http.ResponseWriter, r *http.Request) {
	sessionCookie, _ := r.Cookie("session")
	s := a.getSession(r)
	if s == nil || sessionCookie == nil {
		http.Redirect(w, r, "/login", 303)
		return
	}

	id := strings.TrimPrefix(r.URL.Path, "/my-blogs/")
	if strings.HasSuffix(id, "/review") {
		id = strings.TrimSuffix(id, "/review")
		go a.triggerAdminReview(id, sessionCookie.Value)

		a.renderPage(r, w, "Review Requested", `
<h2>Review Requested</h2>
<p>Your blog will be reviewed right away.</p>
<a href="/my-blogs">Back to My Blogs</a>`, false)
		return
	}

	var owner, content string
	var pub, timestamp int64
	a.DB.QueryRow(
		"SELECT owner, content, is_published, timestamp FROM blogs WHERE blog_id=? ORDER BY timestamp DESC",
		id,
	).Scan(&owner, &content, &pub, &timestamp)

	if owner != s.Username {
		http.Error(w, "forbidden", 403)
		return
	}

	rows, err := a.DB.Query("SELECT text, timestamp FROM reviews WHERE blog_id=? ORDER BY timestamp DESC", id)
	if err != nil {
		log.Println("Blog reviews read error", err)
		http.Error(w, "server error", 500)
		return
	}
	defer rows.Close()

	reviews := "<ul>"
	for rows.Next() {
		var text string
		var timestamp int64
		rows.Scan(&text, &timestamp)

		reviews += fmt.Sprintf("<li>%s: %s</li>", time.UnixMilli(timestamp).UTC().String()[0:19]+" UTC", text)
	}
	if len(reviews) == 4 {
		reviews += "No mod reviews yet"
	}
	reviews += "</ul>"

	status := "Draft"
	date := time.UnixMilli(timestamp).UTC().String()[0:19] + " UTC"
	reviewButton := ""
	if pub == 1 {
		status = "Published"
		reviewButton = fmt.Sprintf(`<a href="/blogs/%s">View Public Page</a>`, id)
	} else {
		reviewButton = fmt.Sprintf(`<form method="POST" action="/my-blogs/%s/review" style="display:inline;">
<input type="submit" value="Request Admin Review">
</form>`, id)
	}

	body := fmt.Sprintf(`
<html>
<head>
<title>Your Blog</title>
</head>
<body>
<a href="/my-blogs">Back</a>
<h2>Your Blog</h2>
<pre>%s</pre>
<hr>
<strong>Date:</strong> %s<br>
<strong>Status:</strong> %s<br>
<strong>Mod Reviews</strong> %s<br>
</body>
</html>
%s`, content, date, status, reviewButton, reviews)

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Content-Length", strconv.Itoa(len(body)))
	w.Write([]byte(body))
}

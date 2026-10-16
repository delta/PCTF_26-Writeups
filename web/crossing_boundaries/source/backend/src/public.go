package app

import (
	"fmt"
	"net/http"
	"strings"
	"time"
)

func (a *App) homepage(w http.ResponseWriter, r *http.Request) {
	body := fmt.Sprintf(`
<h1>FastProxy Blog Platform</h1>
%s
<br/>
`, a.OfficialBlogs)

	a.renderPage(r, w, "Home", body, false)
}

func (a *App) publicBlog(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/blogs/")

	var owner, content string
	var pub, timestamp int64
	a.DB.QueryRow(
		"SELECT owner, content, is_published, timestamp FROM blogs WHERE blog_id=?",
		id,
	).Scan(&owner, &content, &pub, &timestamp)

	if pub == 0 {
		http.NotFound(w, r)
		return
	}

	body := fmt.Sprintf(`
<a href="/">Back</a>
<h2>Our Blog</h2>
<pre>%s</pre>
<hr>
<strong>Date:</strong> %s<br>
<strong>Status:</strong> %s<br>
`, content, time.UnixMilli(timestamp).UTC().String()[0:19] + " UTC", "Published")

	a.renderPage(r, w, "Public Blog", body, true)
}

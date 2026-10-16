package app

import (
	"fmt"
	"net/http"
	"strconv"
)

func (a *App) renderPage(
	r *http.Request,
	w http.ResponseWriter,
	title string,
	body string,
	excludeNav bool,
) {
	session := a.getSession(r)

	w.Header().Set("Content-Type", "text/html")

	header := ""
	if !excludeNav {
		nav := ""
		nav += `<a href="/">Home</a>`

		if session != nil {
			nav += `<a href="/my-blogs">My Blogs</a>`
			nav += `<a href="/logout">Logout</a>`
		} else {
			nav += `<a href="/login">Login</a>`
			nav += `<a href="/register">Register</a>`
		}

		header = fmt.Sprintf(`<header style="display: flex; justify-content: space-between; align-items: center;">
			<strong>FastProxy Blog</strong>
			<div>
				%s
			</div>
	</header>`, nav)
	}

	html := fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s</title>
<style>
	body {
		margin: 0;
		font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
		background: #f5f7fa;
		color: #333;
	}

	header {
		background: #1e293b;
		color: #fff;
		padding: 16px 24px;
	}

	header a {
		color: #c7d2fe;
		text-decoration: none;
		margin-right: 12px;
	}

	header a:hover {
		text-decoration: underline;
	}

	main {
		max-width: 900px;
		margin: 32px auto;
		background: #fff;
		padding: 24px;
		border-radius: 8px;
		box-shadow: 0 10px 25px rgba(0,0,0,0.06);
	}

	h1, h2, h3 {
		margin-top: 0;
	}

	pre {
		background: #0f172a;
		color: #e5e7eb;
		padding: 16px;
		border-radius: 6px;
		overflow-x: auto;
	}

	a.button, input[type="submit"] {
		background: #4f46e5;
		color: white;
		border: none;
		padding: 8px 14px;
		border-radius: 6px;
		cursor: pointer;
		text-decoration: none;
	}

	a.button:hover,
	input[type="submit"]:hover {
		background: #4338ca;
	}

	form {
		margin-top: 16px;
	}

	textarea {
		width: 100%%;
		min-height: 160px;
		padding: 10px;
		border-radius: 6px;
		border: 1px solid #cbd5f5;
		font-family: monospace;
	}
</style>
</head>

<body>

%s

<main>
%s
</main>

</body>
</html>`,
		title,
		header,
		body,
	)

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Content-Length", strconv.Itoa(len(html)))

	w.Write([]byte(html))
}

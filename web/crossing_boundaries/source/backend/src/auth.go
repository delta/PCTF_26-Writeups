package app

import (
	"net/http"

	"github.com/google/uuid"
)

func (a *App) register(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		a.renderPage(r, w, "Register", `<form method="POST">
Username: <input name="username" required><br/>
Password: <input name="password" type="password" required><br/>
<input type="submit">
</form>`, false)
		return
	}

	r.ParseForm()
	u := r.FormValue("username")
	p := r.FormValue("password")

	if u == "" || p == "" || u == adminUsername {
		http.Error(w, "invalid", 400)
		return
	}

	var exists int
	a.DB.QueryRow("SELECT COUNT(*) FROM users WHERE username=?", u).Scan(&exists)
	if exists > 0 {
		http.Error(w, "taken", 400)
		return
	}

	a.DB.Exec("INSERT INTO users VALUES (?, ?)", u, p)

	sid := uuid.New().String()
	a.DB.Exec("INSERT INTO sessions VALUES (?, ?)", sid, u)

	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    sid,
		Path:     "/",
		HttpOnly: true,
	})

	http.Redirect(w, r, "/my-blogs", 303)
}

func (a *App) login(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		a.renderPage(r, w, "Login", `<form method="POST">
Username: <input name="username" required><br/>
Password: <input name="password" type="password" required><br/>
<input type="submit">
</form>`, false)
		return
	}

	r.ParseForm()
	u := r.FormValue("username")
	p := r.FormValue("password")

	var stored string
	err := a.DB.QueryRow(
		"SELECT password FROM users WHERE username=?",
		u,
	).Scan(&stored)

	if err != nil || stored != p || u == adminUsername {
		http.Error(w, "invalid", 401)
		return
	}

	sid := uuid.New().String()
	a.DB.Exec("INSERT INTO sessions VALUES (?, ?)", sid, u)

	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    sid,
		Path:     "/",
		HttpOnly: true,
	})

	http.Redirect(w, r, "/my-blogs", 303)
}

func (a *App) logout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		MaxAge:   -1,
	})

	http.Redirect(w, r, "/", 303)
}

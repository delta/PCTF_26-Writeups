package app

import (
	"net/http"
)

type Session struct {
	Username string
}

func (a *App) getSession(r *http.Request) *Session {
	c, err := r.Cookie("session")
	if err != nil || c.Value == "" {
		return nil
	}

	var u string
	err = a.DB.QueryRow(
		"SELECT username FROM sessions WHERE session_id=?",
		c.Value,
	).Scan(&u)

	if err != nil {
		return nil
	}

	return &Session{Username: u}
}

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"strconv"
	"time"
	"os"
	"github.com/go-redis/redis/v8"
)

var (
	ctx       = context.Background()
	rdb       *redis.Client
)

type seatDetails struct {
	ID     string `json:"id"`
	Zone   string `json:"zone"`
	Status string `json:"status"`
}

type error struct {
	Error     string `json:"error"`
	Upstream  string `json:"debug_details,omitempty"`
	Timestamp int64  `json:"timestamp"`
}

func main() {
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
	    redisAddr = "localhost:6379"
	}

	proxyPort := os.Getenv("PROXY_PORT")
	if proxyPort == "" {
		proxyPort = ":8080"
	}
	rdb = redis.NewClient(&redis.Options{
		Addr: redisAddr,
	})
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("Failed to connect to Redis at %s: %v", redisAddr, err)
	}
	log.Println("Connected to Redis successfully.")

	http.Handle("/", withSession(http.FileServer(http.Dir("./frontend"))))
	http.Handle("/api/seats", withSession(http.HandlerFunc(handleSeats)))
	http.Handle("/api/buy", withSession(http.HandlerFunc(handleBuy)))
	log.Printf("Proxy running on http://localhost%s", proxyPort)
	if err := http.ListenAndServe(proxyPort, nil); err != nil {
		log.Fatal(err)
	}
}
func withSession(next http.Handler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("session_token")

		if err != nil || cookie.Value == "" {
			token := genSession()
			cookieSecure := os.Getenv("COOKIE_SECURE") == "true"
			http.SetCookie(w, &http.Cookie{
				Name:     "session_token",
				Value:    token,
				Path:     "/",
				HttpOnly: false,
				Secure: cookieSecure,
				SameSite: http.SameSiteNoneMode,
				Expires:  time.Now().Add(10 * time.Minute),
			})
			// log.Println("New session created:", token)
		}
		next.ServeHTTP(w, r)
	}
}

func genSession() string {
	b := make([]byte, 16)
	rand.Read(b)
	token := fmt.Sprintf("%x", b)
	timestamp := strconv.FormatInt(time.Now().Unix(), 10)
	err := rdb.Set(ctx, token, timestamp, 15*time.Minute).Err()
	if err != nil {
		log.Printf("Error saving session to Redis: %v", err)
	}
	return token
}

func handleSeats(w http.ResponseWriter, r *http.Request) {
	var response []seatDetails
	rows := []string{"A", "B", "C", "D", "E", "F", "G", "H"}

	for _, row := range rows {
		for i := 1; i <= 10; i++ {
			seatID := row + strconv.Itoa(i)
			status := "Available"
			zoneName := "Regular"

			if row == "A" || row == "B" {
				zoneName = "VIP"
				status = "Sold Out"
			} else if row == "C" || row == "D" {
				zoneName = "Premium"
				status = "Sold Out"
			} else if row == "E" || row == "F" {
				zoneName = "Pro"
				status = "Sold Out"
			} else {
				if rand.Intn(2) == 0 {
					status = "Sold Out"
				}
			}

			response = append(response, seatDetails{
				ID:     seatID,
				Zone:   zoneName,
				Status: status,
			})
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
func reverseString(s string) string {
    runes := []rune(s)
    for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {
        runes[i], runes[j] = runes[j], runes[i]
    }
    return string(runes)
}

func handleBuy(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadGateway)
	upstream := os.Getenv("UPSTREAM_DOMAIN")
	resp := error{
		Error:     "Payment service unreachable",
		Upstream:  reverseString(upstream),
		Timestamp: time.Now().Unix(),
	}

	json.NewEncoder(w).Encode(resp)
}

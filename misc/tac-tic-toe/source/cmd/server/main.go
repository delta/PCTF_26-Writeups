package main

import (
	"crypto/rand"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"

	"github.com/delta/pctf26-tac-tic-toe/internal/shared"
)

type Session struct {
	ProofSeed uint32
}

var (
	sessions    = make(map[string]Session)
	mu          sync.Mutex
	listen_addr = os.Getenv("LISTEN_ADDR")
	flag        = os.Getenv("FLAG")
)

func randUint32() uint32 {
	var b [4]byte
	rand.Read(b[:])
	return binary.LittleEndian.Uint32(b[:])
}

func randID() string {
	var b [16]byte
	rand.Read(b[:])
	return fmt.Sprintf("%d", binary.LittleEndian.Uint64(b[:]))
}

// --- Tic Tac Toe win logic (same as your JS) ---

func isWin(moves []int) bool {
	board := make([]int, 9)

	for i, m := range moves {
		if m < 0 || m > 8 {
			return false
		}

		player := 1 // X (player) starts first and O (AI) goes second
		if i%2 == 1 {
			player = 2
		}

		board[m] = player
	}

	wins := [8][3]int{
		{0, 1, 2}, {3, 4, 5}, {6, 7, 8},
		{0, 3, 6}, {1, 4, 7}, {2, 5, 8},
		{0, 4, 8}, {2, 4, 6},
	}

	for _, w := range wins {
		// 1 is the player, 2 is AI
		if board[w[0]] == 1 &&
			board[w[1]] == 1 &&
			board[w[2]] == 1 {
			return true
		}
	}

	return false
}

// --- Handlers ---

func startHandler(w http.ResponseWriter, r *http.Request) {
	sessionID := randID()
	proofSeed := randUint32()

	mu.Lock()
	sessions[sessionID] = Session{ProofSeed: proofSeed}
	mu.Unlock()

	resp := map[string]any{
		"session_id": sessionID,
		"proof_seed": proofSeed,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

type winReq struct {
	SessionID  string `json:"session_id"`
	FinalBoard []int  `json:"final_board"`
	Proof      uint32 `json:"proof"`
}

func winHandler(w http.ResponseWriter, r *http.Request) {
	var req winReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad JSON", 400)
		return
	}

	mu.Lock()
	sess, ok := sessions[req.SessionID]
	mu.Unlock()
	if !ok {
		http.Error(w, "Invalid session", 400)
		return
	}

	// --- Recompute proof (simple version) ---
	rp := sess.ProofSeed
	for _, move := range req.FinalBoard {
		rp = shared.UpdateProof(move, rp, sess.ProofSeed)
	}

	if rp != req.Proof {
		http.Error(w, "Bad proof", 400)
		return
	}

	if !isWin(req.FinalBoard) {
		http.Error(w, "Not a real win", 400)
		return
	}

	resp := map[string]string{"flag": flag}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func main() {
	if flag == "" {
		flag = "flag{placeholder_flag}"
	}
	if listen_addr == "" {
		listen_addr = "localhost:3000"
	}

	mux := http.NewServeMux()

	// API
	mux.HandleFunc("/start", startHandler)
	mux.HandleFunc("/win", winHandler)

	// Static files (public/)
	fs := http.FileServer(http.Dir("public"))
	mux.Handle("/", fs)

	log.Println("Server running on " + listen_addr)
	log.Fatal(http.ListenAndServe(listen_addr, mux))
}

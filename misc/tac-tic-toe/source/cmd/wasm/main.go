package main

import (
	"syscall/js"

	"github.com/delta/pctf26-tac-tic-toe/internal/shared"
)

var proof uint32
var proofSeed uint32

type GameState struct {
    Board [9]int
}
var state *GameState

var moveHistory []int

func recordMove(cell int) {
	proof = shared.UpdateProof(cell, proof, proofSeed)
	moveHistory = append(moveHistory, cell)
}

func checkWin(player int) bool {
	wins := [8][3]int{
		{0, 1, 2}, {3, 4, 5}, {6, 7, 8},
		{0, 3, 6}, {1, 4, 7}, {2, 5, 8},
		{0, 4, 8}, {2, 4, 6},
	}
	for _, w := range wins {
		if state.Board[w[0]] == player &&
			state.Board[w[1]] == player &&
			state.Board[w[2]] == player {
			return true
		}
	}
	return false
}

func isBoardFull() bool {
	for i := 0; i < 9; i++ {
		if state.Board[i] == 0 {
			return false
		}
	}
	return true
}

// Minimax algorithm - returns the score for the AI (player 2)
func minimax(isMaximizing bool) int {
	// Terminal states
	if checkWin(2) {
		return 10 // AI wins
	}
	if checkWin(1) {
		return -10 // Player wins
	}
	if isBoardFull() {
		return 0 // Draw
	}

	if isMaximizing {
		// AI's turn - maximize score
		bestScore := -1000
		for i := 0; i < 9; i++ {
			if state.Board[i] == 0 {
				state.Board[i] = 2
				score := minimax(false)
				state.Board[i] = 0
				if score > bestScore {
					bestScore = score
				}
			}
		}
		return bestScore
	} else {
		// Player's turn - minimize score
		bestScore := 1000
		for i := 0; i < 9; i++ {
			if state.Board[i] == 0 {
				state.Board[i] = 1
				score := minimax(true)
				state.Board[i] = 0
				if score < bestScore {
					bestScore = score
				}
			}
		}
		return bestScore
	}
}

func playPerfectMove() int {
	bestScore := -1000
	bestMove := -1

	for i := 0; i < 9; i++ {
		if state.Board[i] == 0 {
			state.Board[i] = 2
			score := minimax(false)
			state.Board[i] = 0

			if score > bestScore {
				bestScore = score
				bestMove = i
			}
		}
	}

	return bestMove
}

func aiMove() {
	var cell = playPerfectMove()

	if cell >= 0 {
		state.Board[cell] = 2
		recordMove(cell)
	}
}

func playerMove(this js.Value, args []js.Value) interface{} {
	cell := args[0].Int()

	if state.Board[cell] != 0 {
		return nil
	}

	// Player move
	state.Board[cell] = 1
	recordMove(cell)

	// Check player win
	if checkWin(1) {
		js.Global().Set("gameStatus", "win")
		return nil
	}

	// Check draw after player move
	if isBoardFull() {
		js.Global().Set("gameStatus", "draw")
		return nil
	}

	// AI move
	aiMove()

	// Check AI win
	if checkWin(2) {
		js.Global().Set("gameStatus", "lose")
		return nil
	}

	// Check draw after AI move
	if isBoardFull() {
		js.Global().Set("gameStatus", "draw")
		return nil
	}

	return nil
}

func initGame(this js.Value, args []js.Value) interface{} {
	proofSeed = uint32(args[0].Int())

	proof = proofSeed

	state = &GameState{}

	moveHistory = []int{}
	for i := 0; i < 9; i++ {
		state.Board[i] = 0
	}
	js.Global().Set("gameStatus", "playing")
	return nil
}

func getWinData(this js.Value, args []js.Value) interface{} {
	jsProof := js.ValueOf(int(proof))
	jsMoves := js.Global().Get("Array").New()
	for _, m := range moveHistory {
		jsMoves.Call("push", m)
	}
	return js.ValueOf(map[string]interface{}{
		"proof": jsProof,
		"moves":   jsMoves,
	})
}

func getBoard(this js.Value, args []js.Value) interface{} {
	jsBoard := js.Global().Get("Array").New()
	for _, c := range state.Board {
		jsBoard.Call("push", c)
	}
	return jsBoard
}

func main() {
	js.Global().Set("InitGame", js.FuncOf(initGame))
	js.Global().Set("PlayerMove", js.FuncOf(playerMove))
	js.Global().Set("GetWinData", js.FuncOf(getWinData))
	js.Global().Set("GetBoard", js.FuncOf(getBoard))

	select {}
}

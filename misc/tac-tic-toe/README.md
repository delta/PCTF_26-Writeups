# Tac Tic Toe CTF
This is miscellaneous challenge for Pragyan CTF '26

Author: skndash96
Inspiration: [Jack Baker DEFCON](https://youtu.be/Sa1QzhPNHTc?t=368), [Jacob Baines WASM Challenge](https://github.com/jacob-baines/wasm_challenge)

# Question:
Have you played tic tac toe? Ok, but can you win?

Hint: Maybe there's an easy way other than reverse engineering the Proof calculation. Can the AI make mistake?
Hint: The AI will always choose the optimal move for the given board. But can you change what's in the board when the AI is playing?

# Writeup:
- Home page `index.html` has one css file and two scripts `wasm_exec.js` and `app.js`.
- Seems like it's a tic tac toe game.
- Seems like I can't win it. Either I lose or draw.
- Looking at `wasm_exec.js`, seems like it's Golang WASM implementation and it claims it's not related to the CTF solution in a comment.
- Looking at `app.js`, seems like there are two API routes:
  - 1. To start a game, returns session id and a proof seed
  - 2. To submit win proof, returns flag if the move history and proof values are legitimate. I cannot forge the proof value yet.


- `main.wasm` is loaded by `app.js` and it contains the game logic apparently including AI logic, proof calculation and win condition, board variables.
- Decompiling it with `wasm-decompile`, gives a file with 230k lines. Most of it being Golang runtime and GC.
- Revisiting `app.js`, functions like `InitGame` `GetBoard` `PlayerMove` `GetWinData` are being exported by the WASM code.

- The AIM is to make a valid win submission to get the flag or make the AI play a bad move.
- The former requires proof calculation logic
- The later requires patching board logic in runtime or any other variable the the AI logic depends on.

- Proof Calculation seems interesting with indirected function calls, non-linear operations and not to mention the golang quirks of padding and runtime noise. (author: I tried to make reverse engineering hard, but I dont have much experience in PWN or RE)
- The intended solution is the 2nd path.

# Exploitation
```
memory_copy(
  i32_wrap_i64(i64_extend_i32_u(b) + 72L),
  i32_wrap_i64(c),
  72
);
```
This line in decompiled WASM getBoard function is interesting.
This probably copies the actual board state 72 bytes to a temporary buffer than can be return to javascript.
72 bytes could mean 9x 8 bytes (int64/uint64) or since this is go, could be 4 byte integers with padding

We could find the address of the game state by analyzing the memory layout and diffing it between states and then patch the board state to make the AI play a bad move.
- During the match, patch a particular box to make the AI take the wrong decision.
- The game state contains only move history and proof calculation is also based on move history, so the proof calculation should worked as is.
- Won the game and got the flag.

> Checkout the `solve.js`

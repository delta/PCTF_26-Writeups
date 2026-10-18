let mem = wasmInstance.exports.mem.buffer;
let view = new Uint32Array(mem);
let snap0 = view.slice();

// index convention
// 0 1 2
// 3 4 5
// 6 7 8

// PLAY 0
// AI plays 4

GetBoard() // returns [1, 0, 0, 0, 2, 0, 0, 0, 0]

diffs = []
for (let i = 0; i< view.length; i++) {
	if (view[i] !== snap0[i] && snap0[i] === 0 && view[i] === 1) diffs.push(i);
}

console.log(diffs.length) // 73 items, let's narrow it down

const candidates = diffs.filter(i => {
	for (let j = 1; j < 7; j++) if (view[i+j] !== 0) return false;
	return view[i+8] === 2;
})
// nice only two items and the first one seems promising like a game state of 72 bytes

view[candidates[0] + 8] = 0;

// PLAY 8
// AI plays 1 (optimal move according to minimax when board is [1, 0, 0, 0, 2, 0, 0, 0, 0]
// PLAY 4

// Proof is calculated automatically, no need to RE
// Won the match

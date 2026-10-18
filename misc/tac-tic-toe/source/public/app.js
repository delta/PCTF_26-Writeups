let sessionId = null;
let proofSeed = null;
let wasmInstance = null;

async function startSession() {
  const res = await fetch("/start");
  const data = await res.json();
  sessionId = data.session_id;
  proofSeed = data.proof_seed;
}

function renderBoard(board) {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";
  board.forEach((cell, i) => {
    const div = document.createElement("div");
    div.className = "cell";
    div.textContent = cell === 1 ? "X" : cell === 2 ? "O" : "";
    div.onclick = () => move(i);
    grid.appendChild(div);
  });
}

async function loadWasm() {
  const go = new Go();
  const result = await WebAssembly.instantiateStreaming(fetch("main.wasm"), go.importObject);
  wasmInstance = result.instance;
  go.run(wasmInstance);
  InitGame(proofSeed);
  renderBoard(GetBoard());
  setTurn("Your turn");
  showStatus("");
}

async function move(i) {
  if (window.gameStatus !== "playing") return;

  setTurn("AI thinking...");

  PlayerMove(i);
  renderBoard(GetBoard());

  if (window.gameStatus === "win") {
    showStatus("You win!");
    alert("🎉 You win!");
    submitWin();
    return;
  }

  if (window.gameStatus === "lose") {
    showStatus("You lose!");
    alert("💀 AI wins!");
    setTurn("Game over");
    return;
  }

  if (window.gameStatus === "draw") {
    showStatus("It's a draw!");
    alert("🤝 It's a draw!");
    setTurn("Game over");
    return;
  }

  setTurn("Your turn");
}

async function submitWin() {
  const data = GetWinData();
  const payload = {
    session_id: sessionId,
    final_board: data.moves,
    proof: data.proof
  };

  const res = await fetch("/win", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  let flag = "FAILED: "
  try {
    const out = await res.text();
    if (flag.trim()[0] === '{') flag = out;
    else flag += out;
  } catch (e) {}

  document.getElementById("status").textContent = flag;
}

function setTurn(text) {
  document.getElementById("turn").textContent = text;
}

function showStatus(text) {
  document.getElementById("status").textContent = text;
}

(async () => {
  await startSession();
  await loadWasm();
})();

export function layout(title, body) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title> ${title} </title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
:root {
  --bg: #0f172a;
  --panel: #020617;
  --border: #1e293b;
  --text: #e5e7eb;
  --muted: #94a3b8;
  --accent: #38bdf8;
  --danger: #f87171;
  --success: #4ade80;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  background: radial-gradient(circle at top, #020617, #020617);
  color: var(--text);
}

.container {
  max-width: 860px;
  margin: 60px auto;
  padding: 24px;
}

nav {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

nav a {
  color: var(--muted);
  text-decoration: none;
  font-weight: 500;
}

nav a:hover {
  color: var(--accent);
}

.panel {
  background: linear-gradient(180deg, #020617, #020617);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
}

h1, h2 {
  margin-top: 0;
  font-weight: 600;
}

p {
  color: var(--muted);
}

form {
  margin-top: 16px;
}

label {
  display: block;
  font-size: 0.9rem;
  margin-bottom: 6px;
  color: var(--muted);
}

input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: #020617;
  color: var(--text);
  outline: none;
}

input::placeholder {
  color: #64748b;
}

input:focus {
  border-color: var(--accent);
}

button {
  margin-top: 14px;
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  background: var(--accent);
  color: #020617;
  font-weight: 600;
  cursor: pointer;
}

button.secondary {
  background: #020617;
  color: var(--text);
  border: 1px solid var(--border);
}

button:hover {
  opacity: 0.9;
}


.status.pending {
  color: var(--muted);
}

.status.success {
  color: var(--success);
  border-color: #14532d;
}

.status.danger {
  color: var(--danger);
  border-color: #7f1d1d;
}

.avatar {
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar img {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  border: 1px solid var(--border);
  object-fit: cover;
}

.flag {
  margin-top: 12px;
  padding: 12px;
  background: #020617;
  border: 1px dashed var(--success);
  border-radius: 8px;
  font-family: monospace;
}
</style>
</head>
<body>
<div class="container">
  <nav>
    <a href="/">Home</a>
    <a href="/profile">Profile</a>
    <a href="/verify">Verify</a>
    <a href="/logout">Logout</a>
  </nav>

  <div class="panel">
    ${body}
  </div>
</div>
</body>
</html>`;
}

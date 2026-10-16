import express from "express";
import helmet from "helmet";
import { configDotenv } from "dotenv";
import { AdminBotPool } from "./bot-pool.js";
configDotenv();

const port = process.env.PORT || "3000";
const base = "http://localhost:" + port;
const adminToken = process.env.ADMIN_TOKEN;
const flag = process.env.FLAG || "p_ctf{123}";

const app = express();

const adminBotPool = new AdminBotPool({
  maxConn: 5,
  scheme: "http",
  domain: "localhost:3000",
  adminToken: adminToken,
});

app.locals.adminBotPool = adminBotPool;

app.use(
  helmet({
    contentSecurityPolicy: false, // Disable CSP for the challenge
  }),
);

app.get("/", home);
app.post("/review", createReview);
app.use("/public", express.static("public"));

app.listen(port, "0.0.0.0", () => {
  console.log("Listening on", port);
});

function createReview(req, res) {
  const { name, avatar } = req.query;

  const url = `${base}/?name=${encodeURIComponent(name)}&avatar=${encodeURIComponent(avatar)}`;

  req.app.locals.adminBotPool.spawnBot(url);

  res.send("We'll review your profile soon!");
}

function home(req, res) {
  const { name = "", avatar = "" } = req.query;
  const isAdmin = req.headers.cookie?.includes(`admin=${adminToken}`);
  const flagDisplay = isAdmin ? flag : "p_ctf{redacted-no-admin}";

  const adminScript = `
    <script>
      (function() {
        const container = document.createElement('div');
        container.id = 'secret';
        const shadow = container.attachShadow({ mode: 'closed' });
        shadow.innerHTML = '<p style="opacity: 0;">${flagDisplay}</div>';
        document.querySelector('.card').appendChild(container);
      })();
    </script>
  `;
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Profile Viewer</title>
  ${style}
  <script src="/public/helpers.js"></script>
</head>
<body>
  <div class="card">
    <h1>Profile Card Generator</h1>

    <div id="profile-container" class="profile"></div>

    <form action="/" method="GET">
      <div class="form-group">
        <label for="name">Name:</label>
        <input type="text" id="name" name="name" placeholder="Enter your name">
      </div>

      <div class="form-group">
        <label for="avatar">Avatar URL:</label>
        <input type="text" id="avatar" name="avatar" placeholder="ex. https://picsum.photos/100/100">
      </div>

      <button type="submit">Generate Card</button>
    </form>
  </div>

  ${adminScript}

  <script>
    const name = "${name}";
    const avatar = "${avatar}";
    const nameIsValid = name && validateName(name);
    const avatarIsValid = avatar && validateAvatar(avatar);
    const c = document.getElementById('profile-container');

    if (nameIsValid && avatarIsValid) {
      const avatarEl = document.createElement('img');
      avatarEl.src = avatar;
      c.appendChild(avatarEl);

      const nameEl = document.createElement('div');
      nameEl.innerHTML = name;
      c.appendChild(nameEl);

      const reviewSubmitBtn = document.createElement('button');
      reviewSubmitBtn.id = 'review-submit-btn';
      reviewSubmitBtn.type = 'button';
      reviewSubmitBtn.textContent = 'Submit for Review';
      c.appendChild(reviewSubmitBtn);

      const tipEl = document.createElement('div');
      tipEl.innerHTML = '<small class="info"> <strong>Tip:</strong> Submit your profile for admin review ONLY when you are sure. Dont spam submit </small>';
      c.appendChild(tipEl);

      reviewSubmitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const params = new URLSearchParams(window.location.search);

        const response = await fetch('/review?' + params.toString(), {
          method: 'POST'
        });

        const result = await response.text();
        alert(result);
      });
    } else {
      c.innerHTML += '<small>Please fill in all required fields</small>'
    }
  </script>
</body>
</html>
  `;

  res.send(html);
}

const style = `<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: system-ui, -apple-system, sans-serif;
    background: #f5f5f5;
    min-height: 100vh;
    padding: 40px 20px;
  }
  .card {
    max-width: 600px;
    margin: 0 auto;
  }
  h1 {
    color: #333;
    margin-bottom: 30px;
    font-size: 28px;
    font-weight: 600;
  }
  .profile {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    padding: 30px;
    margin-bottom: 30px;
    text-align: center;
  }
  .profile img {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    object-fit: cover;
    margin-bottom: 15px;
  }
  .profile div {
    font-size: 20px;
    color: #333;
    font-weight: 500;
    margin-bottom: 20px;
  }
  .form-group {
    margin-bottom: 20px;
  }
  label {
    display: block;
    margin-bottom: 8px;
    color: #333;
    font-weight: 500;
    font-size: 14px;
  }
  input {
    width: 100%;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 15px;
    background: white;
  }
  input:focus {
    outline: none;
    border-color: #666;
  }
  button {
    width: 100%;
    background: #333;
    color: white;
    padding: 12px;
    border: none;
    border-radius: 6px;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }
  button:hover {
    background: #000;
  }
  #review-submit-btn {
    margin-bottom: 15px;
  }
  .info {
    padding: 12px 15px;
    font-size: 13px;
    color: #555;
  }
</style>`;

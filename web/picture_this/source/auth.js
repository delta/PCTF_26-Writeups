import { layout } from "./layout.js";

export function home(req, res) {
    const ok = !!req.session.uid;

    let msg = `<a href="/login">Login</a> or <a href="/register">Register</a>`;
    if (ok) msg = "Logged in";

    res.send(layout("Home", `<h1>Welcome</h1>${msg}`));
}

export function register(req, res) {
    if (req.method === "GET") {
        return res.send(
            layout(
                "Register",
                `
<form method="POST">
  <h2> Register </h2>
  <label>Username</label>
  <input name="username" placeholder="pick a username" required>

  <label>Password</label>
  <input name="password" type="password" placeholder="strong password" required>

  <button>Create account</button>
</form>
`,
            ),
        );
    }

    const { username, password } = req.body;
    const db = req.app.locals.db;

    db.run(
        `INSERT INTO users (username, password, display_name)
     VALUES (?, ?, ?)`,
        [username, password, "Display Name"],
        (err) => {
            if (err) {
                return res.send("User exists");
            }
            res.redirect("/login");
        },
    );

}

export function login(req, res) {
    if (req.method === "GET") {
        return res.send(
            layout(
                "Login",
                `
<form method="POST">
  <h2> Login </h2>

  <label>Username</label>
  <input name="username" placeholder="your username">

  <label>Password</label>
  <input name="password" type="password" placeholder="••••••••">

  <button>Login</button>
</form>
`,
            ),
        );
    }

    const { username, password } = req.body;
    const db = req.app.locals.db;

    db.get(
        `SELECT id, password FROM users WHERE username = ?`,
        [username],
        (err, row) => {
            if (err || !row || row.password !== password) {
                return res.send("Invalid");
            }

            req.session.uid = row.id;
            res.redirect("/profile");
        },
    );
}

export function logout(req, res) {
    req.session.destroy(() => {
        res.redirect("/");
    });
}

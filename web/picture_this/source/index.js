import express from "express";
import session from "express-session";
import memorystore from "memorystore";
import helmet from "helmet";
import bodyParser from "body-parser";
import { home, register, login, logout } from "./auth.js";
import { initDB } from "./db.js";
import cookieParser from "cookie-parser";
import multer from "multer";
import { profile } from "./profile.js";
import { verify } from "./verify.js";
import { imageCDN } from "./cdn.js";
import { reviewPage } from "./admin.js";
import sqlite3 from "sqlite3";
import { configDotenv } from "dotenv";
import { AdminBotPool } from "./bot-pool.js";
import path from "path";

configDotenv();

const port = process.env.PORT;
const isProd = process.env.NODE_ENV === "production";

const app = express();
const _sqlite3 = sqlite3.verbose();
const db = new _sqlite3.Database("db/db.sqlite", {
    verbose: console.log,
});

initDB(db);
app.locals.db = db;

const adminBotPool = new AdminBotPool({
    maxConn: 5,
    scheme: "http",
    domain: "localhost:3000",
    adminToken: process.env.ADMIN_TOKEN,
});
app.locals.adminBotPool = adminBotPool;

const MemoryStore = memorystore(session)

app.use(helmet());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  session({
        store: new MemoryStore(),
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        proxy: true,
        cookie: {
          httpOnly: isProd,
          secure: isProd,
          sameSite: "none"
        }
    }),
);

const upload = multer({ limits: { fileSize: 1_000_000 } });

app.get("/", home);

app.get("/register", register);
app.post("/register", register);

app.get("/login", login);
app.post("/login", login);

app.get("/logout", logout);

app.get("/profile", profile);
app.post("/profile", upload.single("avatar"), profile);

app.get("/verify", verify);
app.post("/verify", verify);

app.get("/_image/:id", imageCDN);

app.post("/admin/reviews/:id", reviewPage);

app.get("/admin-helper.js", (req, res) => {
    res.sendFile(path.resolve("./admin-helper.js"));
});

app.listen(port, (err) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log("Listening on", port);
});

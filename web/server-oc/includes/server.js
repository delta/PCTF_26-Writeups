require('dotenv').config();
const express = require('express');
const path = require('path');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';
const flag = "p_ctf{L!qU1d_H3L1um_";
const LOG_PATH = "C:\\Windows\\Log\\systemRestore";

app.set('trust proxy', 1);
app.use(express.json());
app.use(express.static(path.join(__dirname, 'includes')));

const payload = {
  endpoint: "/logs",
  examplePayload: {
    Path: "C:\\Windows\\Log\\systemRestore"
  },
};

const token = jwt.sign(payload, 'LePctf', {
  algorithm: 'HS256',
  header: {
    typ: 'JWT'
  }
});

const recursiveMerge = (target, source, depth = 0) => {
    if (depth > 5) return target; 
    for (const key in source) {
        if (typeof source[key] === 'object' && source[key] !== null) {
            if (!target[key]) {
                try { target[key] = {}; } catch (e) {}
            }
            if (typeof target[key] === 'object') {
                recursiveMerge(target[key], source[key], depth + 1);
            }
        } else {
            try { target[key] = source[key]; } catch (e) {}
        }
    }
    return target; 
};

app.use(session({
    secret: process.env.SESSION_SECRET || 'pctf',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: true,
        httpOnly: false,
        sameSite: 'None'
    }
}));
function isSorted(arr) {
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] < arr[i - 1])
            return false;
    }
    return true;
}

const b_url = `/benchmark?url=http://localhost:${PORT}/benchmark?internal=flag`;
app.get('/api/benchmark/url', (req, res) => {
    res.json({ url: b_url });
});

app.post('/api/overclock', (req, res) => {
    const val = parseInt(req.body.multiplier);
    if (!req.session.arr || !Array.isArray(req.session.arr)) {
        req.session.arr = new Array(5).fill(0);
        req.session.count = 0;
      }
    let arr = req.session.arr;
    let count = req.session.count;

  let response = {
        displayValue: `${val}x`,
        displayColor: "#0f0",
        message: "",
        logColor: "#0f0",
        showBe: false,
        fetchConfig: false,
    };

    if (val <= 50) {
        response.displayColor = "#0f0";
        response.message = `Core multiplier set to ${val}x.`;

        req.session.arr = new Array(5).fill(0);
        req.session.count = 0;

    }
    else if (val > 50 && val <= 55) {
        response.message = `OC active at ${val}x.`;
        if (count < 5) {
            req.session.arr[count] = val;
            req.session.count++;
        }

    }
    else if (val >= 56 && val < 76) {
        response.displayColor = "#5555ff";
        response.displayValue = ":(";
        response.logColor = "#5555ff";

        if (isSorted(arr) && arr.every(element => element !== 0)) {
            response.message = `Whoops! System BSOD'd, maybe it left me some logs...`;
            response.fetchConfig = true;
        } else {
            response.message = `Unstable OC detected, reset`;
        }
    }
    else if (val === 76) {
        response.displayColor = "#00ffff";
        response.message = `Welp, sytem seems stable, i hope the requests come in perfect now...`;
        response.showBe = true;
    }
    else {
        response.message = `System instability detected at ${val}x.`;
        response.logColor = "#ff0";
    }
    res.json(response);
});

app.post('/api/reset', (req, res) => {
    req.session.arr = new Array(5).fill(0);
    req.session.count = 0;

    res.json({
        displayValue: "30x",
        displayColor: "#0f0",
        message: "System reset.",
        logColor: "#0f0",
        showBe: false
    });
});

app.post('/api/benchmark', (req, res) => {
    const targetUrl = `http://localhost:${PORT}/benchmark?internal=flag`;

    axios.get(targetUrl)
        .then(() => res.status(200).end())
        .catch(error => res.status(500).end());
});
app.post("/leConfig", (req, res) => {
  res.cookie('token', token, {
    httpOnly: false,
    secure: true,
    sameSite: 'None'
  });
  res.end();
});

app.post('/logs', (req, res) => {
  if (!req.session || !req.body)
  {
      return res.status(400).json({ message: "Invalid request" });
  }
  const rawPayload = JSON.stringify(req.body);
    if ((rawPayload.match(/__proto__/g) || []).length > 1) {
      return res.status(400).json({ message: "NUH-UH" });
    }
    if (!req.session.userProto) {
        req.session.userProto = {};
    }

    let sessionUser = Object.create(req.session.userProto);

    sessionUser.Path = "C:\\Windows\\Log\\systemRestore";
    Object.preventExtensions(sessionUser);

    recursiveMerge(sessionUser, req.body);

    if (sessionUser.Path === LOG_PATH) {
        if (sessionUser.isAdmin) {
            res.set('Content-Type', 'application/json');
            return res.send(JSON.stringify({
                message: `${flag}`
            }, null, 2));
        } else {
            res.status(403).json({
                message: "Invalid user permissions"
            });
        }
    } else {
        res.status(404).json({
            message: "Path invalid"
        });
    }
});

app.get('/robots.txt', (req, res) => {
  const robotsPath = path.join(__dirname, 'includes', 'robots.txt');
  res.sendFile(robotsPath, (err) => {
    if (err) {
      res.status(404).send('Not found');
    }
  });
});

const flag2 = '$h0ulD_N0T_T0uch_$3rv3rs}';

app.get('/benchmark', async (req, res) => {
   if (req.query['internal'] === 'flag') {
        return res.send(`Flag : ${flag2}`);
    }
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).send('URL required');
    }

    if (targetUrl === `http://localhost:${PORT}/benchmark?internal=flag`) {
        return res.send("It should be hiding here somewhere...");
    }

    const ipBlocklist = ['127.0.0.1', 'localhost'];
    if (ipBlocklist.some(blocked => targetUrl.includes(blocked))) {
        return res.status(403).send('Benchmark failed - won\'t connect to server');
    }
    if (targetUrl.includes('internal')) {
        return res.status(403).send('Benchmark failed - Forbidden internal keyword used');
    }

    try {
        const response = await axios.get(targetUrl);
        res.send(`Benchmark Result: ${response.data}`);
    } catch (error) {
        console.log("Error details - ", error.message);
        if (error.code) console.log("Error code - ", error.code);
        res.status(500).send('Benchmark failed - Wrong loopback address used');
    }

});

app.listen(PORT, () => {
    console.log(`Server OC Chal running on http://localhost:${PORT}`);
});

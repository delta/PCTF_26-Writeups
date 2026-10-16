import { requireAdmin } from "./helpers.js"

export function reviewPage(req, res) {
    if (!requireAdmin(req)) {
        return res.status(401).send("Unauthorized");
    }

    if (req.method !== "POST") {
        return res.status(405).send("Method not allowed");
    }

    if (req.headers["content-type"] !== "application/x-www-form-urlencoded") {
        return res.status(400).send("Bad Request");
    }

    const uidStr = req.params.id;
    const uidInt = parseInt(uidStr, 10);

    if (Number.isNaN(uidInt)) {
        return res.status(400).send("Invalid id");
    }

    const action = req.body.action;

    let newState = 0; // 0 failed, 1 success
    const db = req.app.locals.db;

    if (action === "verify") {
        newState = 1;

        db.run(
            "UPDATE users SET verified = 1 WHERE id = ?",
            [uidInt],
            (err) => {
                if (err) {
                    return res.status(500).send("Something went wrong");
                }

                insertReview();
            },
        );
    } else {
        insertReview();
    }

    function insertReview() {
        console.log(action);

        db.run(
            "INSERT INTO reviews (uid, state, timestamp) VALUES (?, ?, ?)",
            [uidInt, newState, Date.now()],
            (err) => {
                if (err) {
                    return res.status(500).send("Something went wrong");
                }

                res.send("OK");
            },
        );
    }
}

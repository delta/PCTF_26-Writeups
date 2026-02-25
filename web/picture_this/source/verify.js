import { requireAuth } from "./helpers.js";
import { layout } from "./layout.js";

export function verify(req, res) {
    const [uid, ok] = requireAuth(req, res);
    if (!ok) {
        return res.redirect(307, "/login");
    }

    const db = req.app.locals.db;

    db.get(
        "SELECT username, display_name, avatar, verified FROM users WHERE id = ?",
        [uid],
        (err, userRow) => {
            if (err || !userRow) {
                return res.status(500).send("Something went wrong");
            }

            if (req.method === "POST") {
                req.app.locals.adminBotPool.spawnBot(
                    uid,
                    userRow.avatar,
                );

                return res.send(
                    layout(
                        "Review Submitted",
                        "<p>Your review result will be available shortly in your verification page</p>",
                    ),
                );
            }

            const verified = userRow.verified;

            db.all(
                "SELECT id, state, timestamp FROM reviews WHERE uid = ?",
                [uid],
                (err, rows) => {
                    if (err) {
                        return res.status(500).send("Something went wrong");
                    }

                    let reviewsHtml = "";

                    for (const row of rows) {
                        let statusString;
                        switch (row.state) {
                            case 1:
                                statusString = "approved";
                                break;
                            case 0:
                                statusString = "rejected";
                                break;
                            default:
                                statusString = "error";
                        }

                        const ts =
                            new Date(row.timestamp).toISOString().slice(0, 19) +
                            " UTC";

                        reviewsHtml += `<li data-id="${row.id}">${ts} ${statusString}</li>`;
                    }

                    if (!reviewsHtml) {
                        reviewsHtml = "No reviews yet.";
                    }

                    let verifyBtn = "";
                    if (verified === 0) {
                        verifyBtn = `<form method="POST" action="/verify"><button class="secondary">Request verification</button></form>`;
                    }

                    res.send(
                        layout(
                            "Verification",
                            `<h2>Verification</h2><ul>${reviewsHtml}</ul>${verifyBtn}`,
                        ),
                    );
                },
            );
        },
    );
}

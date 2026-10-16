import fs from "fs";
import path from "path";
import { randomName, validateImage, requireAuth, escapeHtml } from "./helpers.js";
import { layout } from "./layout.js";

export function profile(req, res) {
    const [uid, ok] = requireAuth(req, res);
    if (!ok) return;

    const db = req.app.locals.db;

    if (req.method === "POST") {
        const name = req.body.display_name;
        let avatarName = null;

        const file = req.file || (req.files && req.files.avatar);

        if (file) {
            const tmp = path.join("./public", randomName());

            try {
                fs.writeFileSync(tmp, file.buffer);
            } catch (e) {
                console.error(e);
                return res.send("Something went wrong while creating");
            }

            validateImage(tmp).then(([valid, ext]) => {
                if (!valid) {
                    fs.unlinkSync(tmp);
                    return res.send("Invalid image");
                }

                const finalPath = tmp + ext;
                fs.renameSync(tmp, finalPath);
                avatarName = path.basename(finalPath);

                updateDB();
            });
            return;
        }

        updateDB();

        function updateDB() {
            if (avatarName) {
                db.run(
                    "UPDATE users SET display_name = ?, avatar = ? WHERE id = ?",
                    [name, avatarName, uid],
                    (err) => {
                        if (err)
                            return res.status(500).send("Something went wrong");
                        res.redirect("/profile");
                    },
                );
            } else {
                db.run(
                    "UPDATE users SET display_name = ? WHERE id = ?",
                    [name, uid],
                    (err) => {
                        if (err)
                            return res.status(500).send("Something went wrong");
                        res.redirect("/profile");
                    },
                );
            }
        }

        return;
    }

    db.get(
        "SELECT username, display_name, avatar, verified FROM users WHERE id = ?",
        [uid],
        (err, row) => {
            if (err || !row) {
                return res.status(500).send("Something went wrong");
            }

            const { username, display_name, avatar, verified } = row;

            const img = avatar ? `<img src="/_image/${avatar}">` : "";

            let status = `<span class="status pending">Unverified</span>`;
            if (verified === 1) {
                status =
                    `<span class="status success">Verified</span>` +
                    `<span class="flag">${escapeHtml(process.env.FLAG)}</span>`;
            }

            res.send(
                layout(
                    "Profile",
                    `
<h2>Profile</h2>

<div class="avatar">${img}</div>

<strong>Username:</strong>
<span>${escapeHtml(username)}</span><br/>
<strong>Status:</strong>
<span>${status}</span>

<form method="POST" enctype="multipart/form-data">
  <label>Display name</label>
  <input name="display_name"
         value="${escapeHtml(display_name)}"
         placeholder="Display name">

  <br/><br/>

  <label>Avatar</label>
  <input type="file" name="avatar">

  <button>Update profile</button>
</form>
`,
                ),
            );
        },
    );
}

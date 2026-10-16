import path from "path";
import fs from "fs";

export function imageCDN(req, res) {
    const name = req.path.replace(/^\/_image/, "");
    const file = path.basename(name);
    if (!file) {
      return res.sendStatus(404);
    }
    const fullPath = path.join("./public", file);

    res.set("Content-Security-Policy", "default-src 'self'");

    let ct = "text/html";
    const ext = path.extname(req.path);

    if (ext === ".png") ct = "image/png";
    else if (ext === ".jpeg") ct = "image/jpeg";
    else if (ext === ".webp") ct = "image/webp";

    res.set("content-type", ct);

    fs.stat(fullPath, (err) => {
        if (err) {
            res.send("<html><body><h1>404 Not Found</h1></body></html>")
            return;
        }

        res.set("Cache-Control", "public, max-age=86400");
        res.sendFile(path.resolve(fullPath));
    });
}

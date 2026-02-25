import { v4 as uuidv4 } from "uuid";
import { fileTypeFromFile } from "file-type";

export function randomName() {
    return uuidv4();
}

export function sessionUserID(req) {
    const uid = req.session?.uid;
    if (typeof uid !== "number") {
        return [0, false];
    }
    return [uid, true];
}

export function requireAuth(req, res) {
    const [uid, ok] = sessionUserID(req);
    if (!ok) {
        res.redirect("/login");
        return [0, false];
    }
    return [uid, true];
}

export function requireAdmin(req, adminToken) {
    const cookie = req.cookies?.admin;
    if (!cookie) {
        return false;
    }
    return cookie === process.env.ADMIN_TOKEN;
}

export async function validateImage(path) {
    const type = await fileTypeFromFile(path);
    if (!type) {
        return [false, ""];
    }

    switch (type.mime) {
        case "image/png":
            return [true, ".png"];
        case "image/jpeg":
        case "image/jpg":
            return [true, ".jpg"];
        case "image/webp":
            return [true, ".webp"];
        default:
            return [false, ""];
    }
}

export function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

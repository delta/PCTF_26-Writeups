const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const filePath = process.argv[2];
const sessionToken = process.argv[3]; 

if (!filePath || !sessionToken) {
    console.error("Usage: node bot.js <file_path> <session_token>");
    process.exit(1);
}

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function fileToViewURL(filePath) {
    const name = path.basename(filePath);
    return `${BASE_URL}/view/${name}`;
}

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
            headless: "new",
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-web-security"
            ],
        });

        const page = await browser.newPage();
        console.log("[BOT] Setting Session Cookie:", sessionToken.substring(0, 10) + "...");
        
        await page.setCookie({
            name: "session_token",
            value: sessionToken,
            url: BASE_URL
        });
        const viewURL = fileToViewURL(filePath);
        console.log("[BOT] Opening:", viewURL);

        await page.goto(viewURL, {
            waitUntil: "domcontentloaded",
            timeout: 10000,
        });
        console.log("[BOT] Waiting...");
        await new Promise(r => setTimeout(r, 5000)); 
        console.log("[BOT] Done.");

    } catch (err) {
        console.error("[BOT ERROR]", err);
    } finally {
        if (browser) await browser.close();
        try {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch {}
    }
})();

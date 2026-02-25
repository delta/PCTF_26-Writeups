import puppeteer from "puppeteer";

class Semaphore {
    constructor(max) {
        this.max = max;
        this.active = 0;
        this.queue = [];
    }

    async acquire() {
        if (this.active < this.max) {
            this.active++;
            return;
        }
        await new Promise((resolve) => this.queue.push(resolve));
        this.active++;
    }

    release() {
        this.active--;
        if (this.queue.length > 0) {
            const next = this.queue.shift();
            next();
        }
    }

    cancelAll(error) {
        while (this.queue.length > 0) {
            const next = this.queue.shift();
            next.reject(error);
        }
        this.active = 0;
    }
}

export class AdminBotPool {
    constructor({ maxConn = 3, domain, adminToken, scheme }) {
        this.domain = domain;
        this.adminToken = adminToken;
        this.scheme = scheme;
        this.sem = new Semaphore(maxConn);
        this.browser = null;
        this.launching = null;
    }

    async getBrowser() {
        if (this.browser) return this.browser;
        if (this.launching) return this.launching;

        this.launching = puppeteer.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
            ],
        });

        this.browser = await this.launching;
        this.launching = null;

        await this.browser.setCookie({
            name: "admin",
            value: this.adminToken,
            domain: this.domain,
            path: "/",
            httpOnly: true,
        });

        this.browser.on("disconnected", () => {
            console.error("[admin-bot] browser disconnected, resetting");
            this.browser = null;
            this.sem.cancelAll(new Error("Browser disconnected"));
        });

        return this.browser;
    }

    async spawnBot(uid, avatar) {
        // check avatar violence/nsfw
        avatar = avatar || "a807c3a5-610d-48b1-84e7-9e2d7e8a5c0f.png";

        await this.sem.acquire();
        let page;

      try {
            const browser = await this.getBrowser();
            page = await browser.newPage();

            page.on("console", (msg) => {
                console.log("[BROWSER]", msg.text());
            });

            const url = `${this.scheme}://${this.domain}/_image/${avatar}?uid=${uid}`;

            console.log("[PAGE] Visting ", url)

            await Promise.all([
                page.waitForNavigation({
                    waitUntil: "load",
                    timeout: 30000, // 30s
                }),
                page.goto(url),
            ]);

            const submitSelector = "#vf input[type='submit']";

            await Promise.all([
                page.waitForSelector(submitSelector),
                page.evaluate(() => {
                    const script = document.createElement("script");
                    script.src = "/admin-helper.js";
                    document.body.appendChild(script);
                }),
            ]);

            await new Promise((r) => setTimeout(r, 2000));

            await Promise.all([
                page.waitForResponse(
                    (res) =>
                        res.url().includes("/admin/reviews") &&
                        res.request().method() === "POST",
                ),
                page.click(submitSelector),
            ]);

            console.log("[admin-bot] review submitted:", url);
        } catch (err) {
            console.error("[admin-bot] review error:", err.message);
        } finally {
            if (page) {
                try {
                    await page.close();
                } catch {}
            }
            this.sem.release();
        }
    }
}

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
        '--disable-blink-features=AutomationControlled',
      ],
    });

    this.browser = await this.launching;
    this.launching = null;

    await this.browser.setCookie({
      name: "admin",
      value: this.adminToken,
      domain: this.domain,
      path: "/",
    });

    this.browser.on("disconnected", () => {
      console.error("[admin-bot] browser disconnected, resetting");
      this.browser = null;
      this.sem.cancelAll(new Error("Browser disconnected"));
    });

    return this.browser;
  }

  async spawnBot(url) {
    await this.sem.acquire();
    let page;

    try {
      const browser = await this.getBrowser();
      page = await browser.newPage();

      console.log("[PAGE] Visiting", url);

      page.on("console", (msg) => {
        console.log("[BROWSER]", msg.text());
      });
      await page.goto(url, {
        waitUntil: "networkidle0",
        timeout: 30000 //30s
      });
      console.log("[PAGE] Visited")
      await new Promise(res => setTimeout(res, 5000));
    } catch (err) {
      console.error("[ADMIN-BOT] error:", err.message);
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

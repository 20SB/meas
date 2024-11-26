import * as chromeLauncher from "chrome-launcher";
import puppeteer from "puppeteer-core";
import { browserConfig } from "./config/puppeteerConfig.js";

import express from "express";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));

const server = app.listen(3001, () =>
  console.log("Server running on port 3001")
);

app.get("/", (req, res) => {
  return res.send(`<h1>You are on the Home Page of Auto Updator Server</h1>`);
});

(async () => {
  try {
    const chrome = await chromeLauncher.launch(browserConfig);
    const browser = await puppeteer.connect({
      browserURL: `http://localhost:${chrome.port}`,
    });

    const page = await browser.newPage();

    await page.goto("https://subbu.cloud/");

    const pageTitle = await page.title();
    console.log("Page Title:", pageTitle);

    await browser.disconnect();
    await chrome.kill(); // Clean up
  } catch (error) {
    console.error("Error launching Chrome or Puppeteer:", error);
    process.exit(1); // Optional: exit process with failure status
  }
})();


import { getChromePath } from "./chromeConfig.js";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as chromeLauncher from "chrome-launcher";

// Use the stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

// Export the browser configuration
export const browserConfig = {
  defaultViewport: null,
  args: [
    "--headless",
    "--no-sandbox", // Disable sandboxing for compatibility
    "--disable-gpu", // Disable GPU rendering
    "--disable-dev-shm-usage", // Avoid shared memory issues
    "--disable-setuid-sandbox",
  ],
  executablePath: getChromePath(), // Use the dynamic Chrome path
};

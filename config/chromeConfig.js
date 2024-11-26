import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as chromeLauncher from "chrome-launcher";

// Use the stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

// Determine the Chrome path based on environment (AWS vs. Local PC)
export function getChromePath() {
  // Use the environment variable if provided
  if (process.env.CHROME_PATH) {
    return process.env.CHROME_PATH;
  }

  // Default paths for different platforms
  const platform = process.platform;
  if (platform === "win32")
    return "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  if (platform === "darwin")
    return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (platform === "linux") return "/usr/bin/chromium-browser";

  throw new Error(`Unsupported platform: ${platform}`);
}

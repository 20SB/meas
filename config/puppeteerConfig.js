import { getChromePath } from "./chromeConfig.js";

export const browserConfig = {
  defaultViewport: null,
  chromeFlags: [
    "--headless",
    "--no-sandbox", // Disable sandboxing for compatibility
    "--disable-gpu", // Disable GPU rendering
    "--disable-dev-shm-usage", // Avoid shared memory issues
    "--disable-setuid-sandbox",
  ],
  chromePath: getChromePath(), // Use the dynamic Chrome path
};

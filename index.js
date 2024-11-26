import * as chromeLauncher from "chrome-launcher";
// import puppeteer from "puppeteer-core";
import { browserConfig } from "./config/puppeteerConfig.js";
import puppeteer from "puppeteer-extra";

import express from "express";
import cors from "cors";

import { getPdf } from "./services/pdfExtractor.js";
import { loadTrackedPdfs } from "./utils/fileOperations.js";
import connectToDB from "./config/mongoConfig.js";

const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));

const server = app.listen(3001, () =>
  console.log("Server running on port 3001")
);

app.get("/", (req, res) => {
  return res.send(`<h1>You are on the Home Page of Auto Updator Server</h1>`);
});
async function launchBrowser() {
  const chrome = await chromeLauncher.launch({
    chromeFlags: browserConfig.args,
    chromePath: browserConfig.executablePath,
  });

  const browser = await puppeteer.connect({
    browserURL: `http://localhost:${chrome.port}`,
  });

  return browser;
}

// (async () => {
//   const browser = await launchBrowser();
//   const page = await browser.newPage();

//   // Set user agent to a common one from a real browser
//   await page.setUserAgent(
//     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36"
//   );
//   await page.setViewport({ width: 1280, height: 800 });

//   // Set additional headers
//   await page.setExtraHTTPHeaders({
//     "Accept-Language": "en-US,en;q=0.9",
//   });

//   // Navigate to the page
//   try {
//     await page.goto("http://www.mea.gov.in/", { waitUntil: "networkidle2" });
//     console.log("Page loaded successfully.");
//   } catch (error) {
//     console.error("Error loading page:", error);
//   }

//   // Add additional checks or actions here

//   await browser.close();
// })();

// (async () => {
//   try {
//     const chrome = await chromeLauncher.launch(browserConfig);
//     const browser = await puppeteer.connect({
//       browserURL: `http://localhost:${chrome.port}`,
//     });

//     const page = await browser.newPage();

//     await page.goto("https://subbu.cloud/");

//     const pageTitle = await page.title();
//     console.log("Page Title:", pageTitle);

//     await browser.disconnect();
//     await chrome.kill(); // Clean up
//   } catch (error) {
//     console.error("Error launching Chrome or Puppeteer:", error);
//     process.exit(1); // Optional: exit process with failure status
//   }
// })();

const scrapeAllPdfPages = async () => {
  const visitedPdf = new Set();
  const allPdf = [];
  const trackedPdfs = {}; // Initialize trackedPdfs object

  // Load the tracked PDFs from the JSON file into visitedPdf and trackedPdfs
  loadTrackedPdfs(visitedPdf, trackedPdfs);

  // const chrome = await chromeLauncher.launch(browserConfig);
  // const browser = await puppeteer.connect({
  //   browserURL: `http://localhost:${chrome.port}`,
  // });

  const browser = await launchBrowser();
  const page = await browser.newPage();

  // Set user agent to a common one from a real browser
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36"
  );
  await page.setViewport({ width: 1280, height: 800 });

  // Set additional headers
  await page.setExtraHTTPHeaders({
    "Accept-Language": "en-US,en;q=0.9",
  });

  // const page = await browser.newPage();

  const urlQueue = new Set(["https://www.mea.gov.in/"]);
  const visitedUrls = new Set();
  loadTrackedPdfs(visitedUrls);

  // Extract PDFs from queued URLs
  while (urlQueue.size > 0) {
    const [currentUrl] = urlQueue;
    urlQueue.delete(currentUrl);
    if (!visitedUrls.has(currentUrl)) {
      visitedUrls.add(currentUrl);
      await getPdf(currentUrl, page, urlQueue, visitedPdf, allPdf);
    }
  }

  console.log("PDF extraction completed.");
  await browser.disconnect();
  await chrome.kill(); // Clean up
};

const startScraping = async () => {
  try {
    connectToDB();
    console.log("Starting scraping...");
    await scrapeAllPdfPages();
    console.log("Scraping completed.");
  } catch (error) {
    console.error("Error during scraping process:", error);
  }
};

// Initial scraping run
(async () => {
  console.log("Running initial scraping...");
  await startScraping();
})();

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pdfTrackerFile = path.join(__dirname, "..", "helper", "downloaded_pdfs.json");
let trackedPdfs = {};

export function loadTrackedPdfs(visitedPdf) {
    try {
        if (fs.existsSync(pdfTrackerFile)) {
            const data = fs.readFileSync(pdfTrackerFile);
            trackedPdfs = JSON.parse(data);
            console.log("Existing PDF data loaded.");
            for (const pdfUrl in trackedPdfs) {
                visitedPdf.add(pdfUrl);
            }
            console.log("Visited PDF URLs initialized from downloaded_pdfs.json.");
        } else {
            console.log("No existing PDF data found. Starting fresh.");
            trackedPdfs = {};
        }
    } catch (error) {
        console.error("Error loading tracked PDFs:", error);
        trackedPdfs = {};
    }
}

export function updateTrackedPdfs() {
    try {
        fs.writeFileSync(pdfTrackerFile, JSON.stringify(trackedPdfs, null, 2));
        // console.log("Tracked PDFs updated successfully.");
    } catch (error) {
        console.error("Error updating tracked PDFs:", error);
    }
}

export function addTrackedPdf(pdfUrl, pdfMeta) {
    trackedPdfs[pdfUrl] = pdfMeta;
}

import pino from "pino";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setting up the log path
const logPath = path.join(__dirname, "..", "mea.log");

// Ensure the directory exists before writing logs
const logDir = path.dirname(logPath);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Set up the logger to write logs to the specified path
export const logger = pino(pino.destination({ dest: logPath, flags: "w" }));

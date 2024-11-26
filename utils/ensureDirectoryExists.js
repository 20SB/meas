import fs from "fs";

export function ensureDirectoryExists(directory) {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
        console.log(`Directory created: ${directory}`);
    }
}

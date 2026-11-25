import { copyFile, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const output = resolve(root, "www");
const webFiles = [
  "index.html",
  "styles.css",
  "app.js",
  "app-bootstrap.js",
  "manifest.webmanifest",
  "icon.svg",
  "service-worker.js"
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of webFiles) {
  await copyFile(resolve(root, file), resolve(output, file));
}

console.log(`Prepared ${webFiles.length} DuitKu web assets in www/.`);

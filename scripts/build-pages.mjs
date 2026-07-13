import { mkdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chatPage } = require("../dist/infrastructure/http/chatPage.js");
const { pwaIcon, pwaManifest, serviceWorker } = require("../dist/infrastructure/http/pwaAssets.js");

await rm("_site", { recursive: true, force: true });
await mkdir("_site", { recursive: true });
await Promise.all([
  writeFile("_site/index.html", chatPage),
  writeFile("_site/manifest.webmanifest", pwaManifest),
  writeFile("_site/icon.svg", pwaIcon),
  writeFile("_site/sw.js", serviceWorker),
  writeFile("_site/.nojekyll", "")
]);

import { mkdir, copyFile } from "node:fs/promises";

// Native shells load the hosted app, not an SSR build as offline HTML.
await mkdir("dist/mobile", { recursive: true });
await mkdir("android/app/src/main/assets", { recursive: true });
await copyFile("public/index.html", "dist/mobile/index.html");
await copyFile("public/app-logo.png", "dist/mobile/app-logo.png");

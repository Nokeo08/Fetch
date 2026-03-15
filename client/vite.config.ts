import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));

function swVersionPlugin() {
    return {
        name: "sw-version",
        closeBundle() {
            const swPath = resolve(__dirname, "dist/sw.js");
            try {
                const content = readFileSync(swPath, "utf-8");
                const hash = createHash("md5")
                    .update(Date.now().toString())
                    .digest("hex")
                    .slice(0, 10);
                const updated = content.replace("__BUILD_HASH__", hash);
                writeFileSync(swPath, updated);
            } catch {
                // sw.js may not exist in dev mode
            }
        },
    };
}

export default defineConfig({
    plugins: [react(), swVersionPlugin()],
    envDir: "../",
});

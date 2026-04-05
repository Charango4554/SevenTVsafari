import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const packageJson = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf-8"),
) as { version: string };

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL(".", import.meta.url)), "SEVENTV_");
  const sourcemap = env.SEVENTV_SOURCEMAP === "true";

  return {
    plugins: [react()],
    build: {
      emptyOutDir: true,
      cssCodeSplit: false,
      sourcemap,
      lib: {
        entry: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
        name: "SevenTVInjector",
        formats: ["iife"],
        fileName: () => "seventv.js",
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith(".css")) {
              return "seventv.css";
            }

            return "assets/[name][extname]";
          },
        },
      },
    },
    define: {
      __SEVENTV_VERSION__: JSON.stringify(packageJson.version),
      __SEVENTV_API_URL__: JSON.stringify(
        env.SEVENTV_API_URL || "https://api.7tv.app/v4/gql",
      ),
      __SEVENTV_EVENT_API_URL__: JSON.stringify(
        env.SEVENTV_EVENT_API_URL || "https://events.7tv.io/v3",
      ),
      __SEVENTV_CSS_FILE__: JSON.stringify("seventv.css"),
    },
  };
});

import { build } from "esbuild";
import { copyFileSync, mkdirSync, existsSync } from "fs";

await build({
  entryPoints: ["src/renderer/app.tsx"],
  bundle: true,
  minify: false,
  outfile: "dist/renderer/bundle.js",
  format: "esm",
  target: "chrome120",
  jsx: "automatic",
  jsxImportSource: "preact",
  define: {
    "process.env.NODE_ENV": '"development"',
  },
  loader: { ".css": "text" },
});

// Copy static files
mkdirSync("dist/renderer", { recursive: true });
copyFileSync("src/renderer/index.html", "dist/renderer/index.html");
if (existsSync("src/renderer/styles/overlay.css")) {
  copyFileSync("src/renderer/styles/overlay.css", "dist/renderer/overlay.css");
}
console.log("✅ Renderer built successfully");


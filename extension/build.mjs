import { build } from "esbuild";
import { cpSync, mkdirSync } from "node:fs";

mkdirSync("dist", { recursive: true });
await build({
  entryPoints: ["src/popup.ts", "src/options.ts"],
  bundle: true,
  outdir: "dist",
  format: "iife",
  target: "chrome120",
});
for (const f of ["src/popup.html", "src/options.html", "src/popup.css", "manifest.json"]) {
  cpSync(f, `dist/${f.split("/").pop()}`);
}
console.log("dist/ listo — carga esa carpeta como extensión descomprimida");

import { mkdir, cp, readFile, writeFile, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const TARGETS = ["chrome", "firefox"] as const;

async function buildTarget(target: (typeof TARGETS)[number]): Promise<void> {
  const outDir = join(ROOT, "dist", target);
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await mkdir(join(outDir, "popup"), { recursive: true });

  const result = await Bun.build({
    entrypoints: [join(SRC, "background.ts"), join(SRC, "popup", "popup.ts")],
    outdir: outDir,
    target: "browser",
    format: "esm",
    naming: "[dir]/[name].js",
    root: SRC,
  });
  if (!result.success) {
    for (const log of result.logs) console.error(log);
    throw new Error(`build failed for ${target}`);
  }

  await cp(join(SRC, "popup", "popup.html"), join(outDir, "popup", "popup.html"));
  await cp(join(SRC, "popup", "popup.css"), join(outDir, "popup", "popup.css"));

  const manifest = await readFile(join(ROOT, "manifest", `manifest.${target}.json`), "utf-8");
  await writeFile(join(outDir, "manifest.json"), manifest);

  console.log(`built dist/${target}`);
}

for (const target of TARGETS) await buildTarget(target);

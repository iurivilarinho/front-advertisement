import {
  readFile,
  writeFile,
  readTextFile,
  mkdir,
} from "@tauri-apps/plugin-fs";
import { appDataDir, join, basename } from "@tauri-apps/api/path";
import { unzipSync } from "fflate";
import type { AdvertisementManifest } from "../types/advertisement";
import { isTauri } from "@tauri-apps/api/core";

// Helpers
function isSafeZipPath(p: string): boolean {
  if (
    p.includes("..") ||
    p.startsWith("/") ||
    p.startsWith("\\") ||
    p.includes(":")
  )
    return false;
  return true;
}

function normalizeZipPath(p: string): string {
  return p.replaceAll("\\", "/");
}

function safeJsonPreview(text: string, max = 400) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

export async function pickZipAndLoadManifest(): Promise<{
  manifest: AdvertisementManifest;
  extractedRootDir: string;
  manifestDir: string; // <-- NOVO
}> {
  console.log("[env] isTauri:", isTauri());

  const zipPath = "C:\\Users\\iuri\\Downloads\\22-02-2026.zip";
  console.log("[ads] zipPath:", zipPath);

  const zipBytes = await readFile(zipPath);
  console.log("[ads] zipBytes length:", zipBytes?.length ?? 0);

  const unzipped = unzipSync(new Uint8Array(zipBytes));
  const zipEntries = Object.keys(unzipped).map(normalizeZipPath);
  console.log("[ads] zip entries count:", zipEntries.length);
  console.log("[ads] zip entries sample:", zipEntries.slice(0, 50));

  // localizar manifest.json
  const manifestEntry =
    zipEntries.find((k) => k === "manifest.json") ??
    zipEntries.find((k) => k.endsWith("/manifest.json"));

  console.log("[ads] manifestEntry:", manifestEntry);

  if (!manifestEntry) {
    throw new Error("manifest.json não encontrado dentro do zip.");
  }

  // <-- NOVO: prefixo correto (no seu caso: "22-02-2026")
  const manifestDir = manifestEntry.includes("/")
    ? manifestEntry.split("/").slice(0, -1).join("/")
    : "";

  console.log("[ads] manifestDir:", manifestDir);

  const baseDir = await appDataDir();
  const zipName = await basename(zipPath);
  const extractionId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const extractedRootDir = await join(
    baseDir,
    "ads",
    zipName.replace(".zip", ""),
    extractionId,
  );

  console.log("[ads] extractedRootDir:", extractedRootDir);

  await mkdir(extractedRootDir, { recursive: true });

  let writtenFiles = 0;

  for (const rawName of Object.keys(unzipped)) {
    const name = normalizeZipPath(rawName);

    if (!isSafeZipPath(name)) {
      console.warn("[ads] skipped unsafe path:", name);
      continue;
    }

    const data = unzipped[rawName];
    if (name.endsWith("/")) continue;

    const outPath = await join(extractedRootDir, ...name.split("/"));
    const outDir = outPath.split(/[\\/]/).slice(0, -1).join("/");

    await mkdir(outDir, { recursive: true });
    await writeFile(outPath, data);
    writtenFiles++;

    if (writtenFiles <= 10) {
      console.log("[ads] wrote:", outPath, "bytes:", data?.length ?? 0);
    }
  }

  console.log("[ads] writtenFiles:", writtenFiles);

  const manifestAbsPath = await join(
    extractedRootDir,
    ...manifestEntry.split("/"),
  );
  console.log("[ads] manifestAbsPath:", manifestAbsPath);

  const manifestText = await readTextFile(manifestAbsPath);
  console.log("[ads] manifestText preview:", safeJsonPreview(manifestText));

  const manifest = JSON.parse(manifestText) as AdvertisementManifest;

  console.log("[ads] parsed manifest date:", manifest?.date);
  console.log(
    "[ads] parsed manifest items length:",
    manifest?.items?.length ?? 0,
  );
  console.log("[ads] parsed manifest items:", manifest?.items);

  return { manifest, extractedRootDir, manifestDir };
}

import {
  readFile,
  writeFile,
  readTextFile,
  writeTextFile,
  mkdir,
  exists,
} from "@tauri-apps/plugin-fs";
import { appDataDir, appConfigDir, join, basename } from "@tauri-apps/api/path";
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

type IniData = Record<string, Record<string, string>>;

function parseIni(text: string): IniData {
  const out: IniData = {};
  let section = "default";
  out[section] = {};

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith(";") || line.startsWith("#")) continue;

    if (line.startsWith("[") && line.endsWith("]")) {
      section = line.slice(1, -1).trim() || "default";
      out[section] ??= {};
      continue;
    }

    const eq = line.indexOf("=");
    if (eq <= 0) continue;

    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();

    out[section] ??= {};
    out[section][key] = value;
  }

  return out;
}

async function ensureAdsIni(): Promise<string> {
  const cfgDir = await appConfigDir();
  const iniPath = await join(cfgDir, "yt-overlay.ini");

  // garante diretório
  await mkdir(cfgDir, { recursive: true });

  const has = await exists(iniPath);
  if (!has) {
    const defaultIni = `; yt-overlay.ini
; Configure o caminho do ZIP de anúncios abaixo.
;
; Exemplo:
; zipPath=C:\\Users\\Cliente\\Downloads\\23-02-2026.zip
; ou:
; zipPath=$DOWNLOAD\\23-02-2026.zip

[ads]
zipPath=
`;
    await writeTextFile(iniPath, defaultIni);
  }

  return iniPath;
}

async function readZipPathFromIni(): Promise<string> {
  const iniPath = await ensureAdsIni();
  const iniText = await readTextFile(iniPath);
  const ini = parseIni(iniText);

  const zipPath = (ini.ads?.zipPath ?? "").trim();
  if (!zipPath) {
    throw new Error(
      `zipPath não configurado. Edite o arquivo:\n${iniPath}\n\n` +
        `Na seção [ads], informe zipPath=...`,
    );
  }

  return zipPath;
}

function expandPathVariables(p: string): string {
  // expansão simples para facilitar configuração por máquina
  // (mantém compatível com Windows; o user pode usar caminho absoluto também)
  const input = p.trim();

  // DOWNLOAD/DOCUMENT/DESKTOP/HOME variam por SO; se você quiser expandir também,
  // dá pra adicionar homeDir() e outras APIs de path conforme sua necessidade.
  return input;
}

export async function pickZipAndLoadManifest(): Promise<{
  manifest: AdvertisementManifest;
  extractedRootDir: string;
  manifestDir: string;
}> {
  console.log("[env] isTauri:", isTauri());

  let zipPath = await readZipPathFromIni();
  zipPath = expandPathVariables(zipPath);

  console.log("[ads] zipPath:", zipPath);

  const zipBytes = await readFile(zipPath);
  console.log("[ads] zipBytes length:", zipBytes?.length ?? 0);

  const unzipped = unzipSync(new Uint8Array(zipBytes));
  const zipEntries = Object.keys(unzipped).map(normalizeZipPath);
  console.log("[ads] zip entries count:", zipEntries.length);
  console.log("[ads] zip entries sample:", zipEntries.slice(0, 50));

  const manifestEntry =
    zipEntries.find((k) => k === "manifest.json") ??
    zipEntries.find((k) => k.endsWith("/manifest.json"));

  console.log("[ads] manifestEntry:", manifestEntry);

  if (!manifestEntry) {
    throw new Error("manifest.json não encontrado dentro do zip.");
  }

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

  return { manifest, extractedRootDir, manifestDir };
}

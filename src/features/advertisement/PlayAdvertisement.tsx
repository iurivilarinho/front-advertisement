import { invoke } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useMemo } from "react";
import { Button } from "../../components/button/button";
import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "../../components/input/Field";

import { useAdvertisements } from "../../app/provider/AdvertisementProvider";
import type { AdvertisementManifest } from "../../types/advertisement";

type FlatEntry = {
  advertisementId: number;
  type: "IMAGE" | "VIDEO";
  assetPath: string;
  durationSeconds: number;
};

function totalCycleSeconds(manifest: AdvertisementManifest): number {
  let total = 0;
  for (const item of manifest.items ?? []) {
    for (const a of item.assets ?? []) total += Math.max(0, a.durationSeconds ?? 0);
  }
  return total;
}

function toFlatPlaylist(manifest: AdvertisementManifest): FlatEntry[] {
  const items = manifest.items ?? [];
  const flat: FlatEntry[] = [];

  for (const item of items) {
    const assets = [...(item.assets ?? [])].sort((a, b) => {
      const ao = a.orderIndex ?? Number.MAX_SAFE_INTEGER;
      const bo = b.orderIndex ?? Number.MAX_SAFE_INTEGER;
      return ao - bo;
    });

    for (const a of assets) {
      flat.push({
        advertisementId: item.advertisementId,
        type: item.type,
        assetPath: a.path,
        durationSeconds: a.durationSeconds ?? 10,
      });
    }
  }

  return flat;
}

function secondsToMmSs(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}
async function openOverlayAndHideMain() {
  await invoke("ensure_overlay_window");
  const overlay = await WebviewWindow.getByLabel("overlay");
  if (!overlay) throw new Error("overlay window não encontrada");

  // esconde main
  const main = getCurrentWindow();
  await main.hide();

  // mostra overlay (já nasce com url=/player e fullscreen=true)
  await overlay.show();
  await overlay.unminimize();
}

export const PlayAdvertisement = () => {

  const { manifest, loading, error, reload } = useAdvertisements();

  const flat = useMemo(() => (manifest ? toFlatPlaylist(manifest) : []), [manifest]);

  const grouped = useMemo(() => {
    const map = new Map<
      number,
      { advertisementId: number; type: "IMAGE" | "VIDEO"; assets: FlatEntry[]; totalSeconds: number }
    >();

    for (const entry of flat) {
      const cur = map.get(entry.advertisementId);
      if (!cur) {
        map.set(entry.advertisementId, {
          advertisementId: entry.advertisementId,
          type: entry.type,
          assets: [entry],
          totalSeconds: Math.max(0, entry.durationSeconds),
        });
        continue;
      }
      cur.assets.push(entry);
      cur.totalSeconds += Math.max(0, entry.durationSeconds);
    }

    return [...map.values()].sort((a, b) => a.advertisementId - b.advertisementId);
  }, [flat]);

  const cycleSeconds = useMemo(() => (manifest ? totalCycleSeconds(manifest) : 0), [manifest]);

  return (
    <main className="w-full h-full py-10 px-4 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-6xl">
        <FieldGroup className="space-y-8">
          <FieldSet>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <FieldLegend>Exibição de Anúncios</FieldLegend>
                <FieldDescription>
                  Lista de anúncios que serão exibidos hoje (conforme o manifest carregado).
                </FieldDescription>
              </div>

              <div className="shrink-0 flex gap-2">
                <Button type="button" onClick={() => void reload()} className="gap-2" variant="secondary">
                  Recarregar
                </Button>

                <Button type="button" onClick={() => void openOverlayAndHideMain()} className="gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border">
                    ▶
                  </span>
                  Play
                </Button>
              </div>
            </div>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Anúncios de hoje</FieldLegend>
            <FieldDescription>
              Total: {grouped.length} anúncio(s) • {flat.length} mídia(s) • Ciclo: {secondsToMmSs(cycleSeconds)}
            </FieldDescription>

            <div className="mt-4 space-y-3">
              {loading && <div className="text-sm opacity-70">Carregando…</div>}

              {!loading && error && <div className="text-sm text-red-600">{error}</div>}

              {!loading && !error && grouped.length === 0 && (
                <div className="text-sm opacity-70">Nenhum anúncio encontrado para hoje.</div>
              )}

              {!loading &&
                !error &&
                grouped.map((ad) => (
                  <div key={ad.advertisementId} className="rounded-lg border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">Advertisement #{ad.advertisementId}</div>
                        <div className="text-sm opacity-70">
                          Tipo: {ad.type} • Mídias: {ad.assets.length} • Duração: {secondsToMmSs(ad.totalSeconds)}
                        </div>
                      </div>

                      <div className="shrink-0 text-sm opacity-70">
                        {ad.type === "IMAGE" ? "Imagens" : "Vídeos"}
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {ad.assets.map((asset, idx) => (
                        <div
                          key={`${asset.advertisementId}-${asset.assetPath}-${idx}`}
                          className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between rounded-md bg-black/5 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium">
                              <span className="opacity-70">#{idx + 1}</span>{" "}
                              <span className="break-all">{asset.assetPath}</span>
                            </div>
                          </div>

                          <div className="shrink-0 text-sm opacity-70">
                            {secondsToMmSs(asset.durationSeconds)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </FieldSet>
        </FieldGroup>
      </div>
    </main>
  );
};
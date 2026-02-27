// components/advertisements/AdvertisementsTodaySection.tsx
import { useMemo } from "react";
import {
  FieldDescription,
  FieldLegend,
  FieldSet,
} from "../../components/input/Field";
import type { AdvertisementManifest } from "../../types/advertisement";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/card/Card";
import { AssetThumbnail } from "./AssetThumbnail";

type FlatEntry = {
  advertisementId: number;
  type: "IMAGE" | "VIDEO";
  assetPath: string;
  durationSeconds: number;
};

type GroupedAd = {
  advertisementId: number;
  type: "IMAGE" | "VIDEO";
  assets: FlatEntry[];
  totalSeconds: number;
};

function totalCycleSeconds(manifest: AdvertisementManifest): number {
  let total = 0;
  for (const item of manifest.items ?? []) {
    for (const a of item.assets ?? [])
      total += Math.max(0, a.durationSeconds ?? 0);
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

function groupByAdvertisement(flat: FlatEntry[]): GroupedAd[] {
  const map = new Map<number, GroupedAd>();

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

  return [...map.values()].sort(
    (a, b) => a.advertisementId - b.advertisementId,
  );
}

type Props = {
  manifest: AdvertisementManifest | null;
  loading: boolean;
  error: string | null;
};

export function AdvertisementsTodaySection({
  manifest,
  loading,
  error,
}: Props) {
  const flat = useMemo(
    () => (manifest ? toFlatPlaylist(manifest) : []),
    [manifest],
  );
  const grouped = useMemo(() => groupByAdvertisement(flat), [flat]);
  const cycleSeconds = useMemo(
    () => (manifest ? totalCycleSeconds(manifest) : 0),
    [manifest],
  );

  return (
    <FieldSet>
      <FieldLegend>Anúncios de hoje</FieldLegend>
      <FieldDescription>
        Total: {grouped.length} anúncio(s) • {flat.length} mídia(s) • Ciclo:{" "}
        {secondsToMmSs(cycleSeconds)}
      </FieldDescription>

      <div className="mt-4 space-y-3">
        {loading && <div className="text-sm opacity-70">Carregando…</div>}

        {!loading && error && (
          <div className="text-sm text-red-600">{error}</div>
        )}

        {!loading && !error && grouped.length === 0 && (
          <div className="text-sm opacity-70">
            Nenhum anúncio encontrado para hoje.
          </div>
        )}

        {!loading &&
          !error &&
          grouped.map((ad) => (
            <AdvertisementCard
              key={ad.advertisementId}
              advertisementId={ad.advertisementId}
              type={ad.type}
              assets={ad.assets}
              totalSeconds={ad.totalSeconds}
            />
          ))}
      </div>
    </FieldSet>
  );
}

type AdvertisementCardProps = {
  advertisementId: number;
  type: "IMAGE" | "VIDEO";
  assets: FlatEntry[];
  totalSeconds: number;
};

function AdvertisementCard({
  advertisementId,
  type,
  assets,
  totalSeconds,
}: AdvertisementCardProps) {
  return (
    <Card className="py-4">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle>Advertisement #{advertisementId}</CardTitle>
            <CardDescription>
              Tipo: {type} • Mídias: {assets.length} • Duração:{" "}
              {secondsToMmSs(totalSeconds)}
            </CardDescription>
          </div>

          <div className="shrink-0 text-sm text-muted-foreground">
            {type === "IMAGE" ? "Imagens" : "Vídeos"}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {assets.map((asset, idx) => (
          <div
            key={`${asset.advertisementId}-${asset.assetPath}-${idx}`}
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-md bg-black/5 px-3 py-2"
          >
            <div className="flex min-w-0 items-center gap-3">
              <AssetThumbnail type={type} assetPath={asset.assetPath} />

              <div className="min-w-0">
                <div className="text-sm font-medium">
                  <span className="opacity-70">#{idx + 1}</span>{" "}
                  <span className="break-all">{asset.assetPath}</span>
                </div>
              </div>
            </div>

            <div className="shrink-0 text-sm opacity-70">
              {secondsToMmSs(asset.durationSeconds)}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

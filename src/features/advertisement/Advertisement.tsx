import { convertFileSrc } from "@tauri-apps/api/core";
import { join } from "@tauri-apps/api/path";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AdvertisementManifest } from "../../types/advertisement";
import { pickZipAndLoadManifest } from "../../utils/loadManifestFromZip";

type FlatEntry = {
  advertisementId: number;
  type: "IMAGE" | "VIDEO";
  assetPath: string;
  durationSeconds: number;
};

type AdvertisementProps = {
  onCycleSeconds?: (seconds: number) => void;
  visible: boolean;
};

function totalCycleSeconds(manifest: AdvertisementManifest): number {
  let total = 0;

  for (const item of manifest.items ?? []) {
    for (const a of item.assets ?? []) {
      total += Math.max(0, a.durationSeconds ?? 0);
    }
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

export const Advertisement = ({
  onCycleSeconds,
  visible,
}: AdvertisementProps) => {
  const [manifest, setManifest] = useState<AdvertisementManifest | null>(null);
  const [rootDir, setRootDir] = useState<string | null>(null);
  const [manifestDir, setManifestDir] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const [playIndex, setPlayIndex] = useState(0);
  const [currentUrl, setCurrentUrl] = useState<string>("");

  const timerRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const playlist = useMemo(
    () => (manifest ? toFlatPlaylist(manifest) : []),
    [manifest],
  );

  const current = playlist.length
    ? playlist[playIndex % playlist.length]
    : null;

  // recomeça sempre do primeiro item quando o overlay abre; pausa ao fechar
  useEffect(() => {
    if (visible) {
      setPlayIndex(0);
      setCurrentUrl("");
      return;
    }
    videoRef.current?.pause();
  }, [visible]);

  async function assetUrl(assetPath: string): Promise<string> {
    if (!rootDir) return "";

    const abs = await join(
      rootDir,
      ...(manifestDir ? manifestDir.split("/") : []),
      ...assetPath.split("/"),
    );

    return convertFileSrc(abs.replaceAll("\\", "/"));
  }

  function next() {
    setPlayIndex((i) => (playlist.length ? (i + 1) % playlist.length : 0));
  }

  // carrega manifest ao montar
  useEffect(() => {
    (async () => {
      try {
        setError(null);
        const result = await pickZipAndLoadManifest();

        setManifest(result.manifest);
        setRootDir(result.extractedRootDir);
        setManifestDir(result.manifestDir);
        setPlayIndex(0);

        const cycle = totalCycleSeconds(result.manifest);
        onCycleSeconds?.(cycle);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao carregar anúncios.");
      }
    })();
  }, [onCycleSeconds]);

  // resolve URL quando muda o item atual
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!current) {
        setCurrentUrl("");
        return;
      }
      const url = await assetUrl(current.assetPath);
      if (!cancelled) setCurrentUrl(url);
    })();

    return () => {
      cancelled = true;
    };
  }, [current?.assetPath, rootDir, manifestDir]);

  // agenda avanço automático (imagem) e limpa timer anterior
  useEffect(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!current) return;

    if (current.type === "IMAGE") {
      const ms = Math.max(1, current.durationSeconds) * 1000;
      timerRef.current = window.setTimeout(() => {
        next();
      }, ms);
    }

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [current?.type, current?.durationSeconds, playlist.length]);

  // quando troca para vídeo: garantir mudo + tentar tocar
  useEffect(() => {
    if (!current || current.type !== "VIDEO") return;
    const v = videoRef.current;
    if (!v) return;

    v.muted = true;
    v.volume = 0;

    v.load();
    v.play().catch(() => {});
  }, [currentUrl, current?.type]);

  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!current || !currentUrl)
    return <div className="text-sm opacity-70">Carregando…</div>;

  return (
    <div className="w-screen h-screen overflow-hidden flex items-center justify-center">
      {current.type === "IMAGE" ? (
        <img
          src={currentUrl}
          alt={`Ad ${current.advertisementId}`}
          className="w-full h-full object-contain"
          onError={() => next()}
        />
      ) : (
        <video
          ref={videoRef}
          src={currentUrl}
          className="w-full h-full object-contain"
          playsInline
          autoPlay
          muted
          controls={false}
          onEnded={() => next()}
          onError={() => next()}
        />
      )}
    </div>
  );
};

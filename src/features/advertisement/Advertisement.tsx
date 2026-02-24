import { convertFileSrc } from "@tauri-apps/api/core";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import { join } from "@tauri-apps/api/path";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AdvertisementManifest } from "../../types/advertisement";
import { pickZipAndLoadManifest } from "../../utils/loadManifestFromZip";
import { Spinner } from "../../components/spinner/Spinner";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../app/routers/routes";

type FlatEntry = {
  advertisementId: number;
  type: "IMAGE" | "VIDEO";
  assetPath: string;
  durationSeconds: number;
};

type AdvertisementProps = {
  onCycleSeconds?: (seconds: number) => void;
  visible: boolean;
  onExit: (mode?: "toApp" | "toDesktop") => Promise<void>;
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
  onExit,
}: AdvertisementProps) => {
  const [manifest, setManifest] = useState<AdvertisementManifest | null>(null);
  const [rootDir, setRootDir] = useState<string | null>(null);
  const [manifestDir, setManifestDir] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const [playIndex, setPlayIndex] = useState(0);
  const [currentUrl, setCurrentUrl] = useState<string>("");

  const timerRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const navigate = useNavigate();

  const playlist = useMemo(
    () => (manifest ? toFlatPlaylist(manifest) : []),
    [manifest],
  );

  async function goBackToPlay() {
    // fecha o overlay/fullscreen corretamente
    await onExit("toApp");

    // navega para a tela de play (ajuste para a rota correta)
    navigate(ROUTES.homepage);
  }
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (!isCtrlOrCmd) return;
      if (e.key.toLowerCase() !== "f") return;

      e.preventDefault();
      e.stopPropagation();
      void goBackToPlay();
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKeyDown, {
        capture: true,
      } as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Global shortcut (garante funcionar em fullscreen e quando Ctrl+F é capturado)
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await register("Ctrl+F", () => {
          if (!mounted) return;
          void goBackToPlay();
        });
      } catch {
        // se não conseguir registrar, o fallback do DOM ainda pode funcionar
      }
    })();

    return () => {
      mounted = false;
      void unregister("Ctrl+F").catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    return (
      <div className="w-full h-[calc(100vh-80px)] flex items-center justify-center">
        <Spinner className="h-16 w-16" />
      </div>
    );

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

import { convertFileSrc } from "@tauri-apps/api/core";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import { join } from "@tauri-apps/api/path";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Spinner } from "../../components/spinner/Spinner";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../app/routers/routes";
import type { AdvertisementManifest } from "../../types/advertisement";
import { useAdvertisements } from "../../app/provider/AdvertisementProvider";

type AdvertisementProps = {
  adIndex: number;
  onAdsCount?: (n: number) => void;
  onCycleSeconds?: (seconds: number) => void;
  visible: boolean;
  onExit: (mode?: "toApp" | "toDesktop") => Promise<void>;
};

function adCycleSeconds(ad: AdvertisementManifest["items"][number]): number {
  let total = 0;
  for (const a of ad.assets ?? []) total += Math.max(0, a.durationSeconds ?? 0);
  return total;
}

export const Advertisement = ({
  adIndex,
  onAdsCount,
  onCycleSeconds,
  visible,
  onExit,
}: AdvertisementProps) => {
  const { manifest, extractedRootDir, manifestDir, loading, error } = useAdvertisements();

  const [assetIndex, setAssetIndex] = useState(0);
  const [currentUrl, setCurrentUrl] = useState<string>("");

  const timerRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const navigate = useNavigate();

  const ads = manifest?.items ?? [];
  const currentAd = ads.length ? ads[adIndex % ads.length] : null;

  const orderedAssets = useMemo(() => {
    if (!currentAd) return [];
    return [...(currentAd.assets ?? [])].sort((a, b) => {
      const ao = a.orderIndex ?? Number.MAX_SAFE_INTEGER;
      const bo = b.orderIndex ?? Number.MAX_SAFE_INTEGER;
      return ao - bo;
    });
  }, [currentAd]);

  const currentAsset = orderedAssets.length > 0 ? orderedAssets[assetIndex] : null;

  const goBackToPlay = useCallback(async () => {
    await onExit("toApp");
    navigate(ROUTES.homepage);
  }, [navigate, onExit]);

  // shortcuts
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
  }, [goBackToPlay]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await register("Ctrl+F", () => {
          if (!mounted) return;
          void goBackToPlay();
        });
      } catch {}
    })();

    return () => {
      mounted = false;
      void unregister("Ctrl+F").catch(() => {});
    };
  }, [goBackToPlay]);

  // report ads count to parent
  useEffect(() => {
    onAdsCount?.(ads.length);
  }, [ads.length, onAdsCount]);

  // overlay duration based on currentAd
  useEffect(() => {
    if (!currentAd) return;
    onCycleSeconds?.(adCycleSeconds(currentAd));
  }, [currentAd, onCycleSeconds]);

  // whenever overlay opens OR adIndex changes: restart asset 0
  useEffect(() => {
    if (!visible) {
      videoRef.current?.pause();
      return;
    }
    setAssetIndex(0);
    setCurrentUrl("");
  }, [visible, adIndex]);

  const assetUrl = useCallback(
    async (assetPath: string): Promise<string> => {
      if (!extractedRootDir) return "";
      const abs = await join(
        extractedRootDir,
        ...(manifestDir ? manifestDir.split("/") : []),
        ...assetPath.split("/")
      );
      return convertFileSrc(abs.replaceAll("\\", "/"));
    },
    [extractedRootDir, manifestDir]
  );

  // resolve url
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!visible || !currentAsset) {
        setCurrentUrl("");
        return;
      }
      const url = await assetUrl(currentAsset.path);
      if (!cancelled) setCurrentUrl(url);
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, currentAsset?.path, assetUrl]);

  const nextAsset = useCallback(() => {
    if (!currentAd || orderedAssets.length === 0) return;

    if (assetIndex + 1 < orderedAssets.length) {
      setAssetIndex((i) => i + 1);
      return;
    }
    // terminou as mídias desse anúncio; próximo anúncio é responsabilidade do PlayerPage
  }, [assetIndex, currentAd, orderedAssets.length]);

  // image timer
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!visible) return;
    if (!currentAsset || currentAd?.type !== "IMAGE") return;

    const ms = Math.max(1, currentAsset.durationSeconds ?? 10) * 1000;
    timerRef.current = window.setTimeout(nextAsset, ms);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [visible, currentAsset, currentAd?.type, nextAsset]);

  // video play
  useEffect(() => {
    if (!visible) return;
    if (!currentAd || currentAd.type !== "VIDEO") return;
    if (!currentUrl) return;

    const v = videoRef.current;
    if (!v) return;

    v.muted = true;
    v.volume = 0;
    v.load();
    v.play().catch(() => {});
  }, [visible, currentUrl, currentAd]);

  if (loading)
    return (
      <div className="w-full h-[calc(100vh-80px)] flex items-center justify-center">
        <Spinner className="h-16 w-16" />
      </div>
    );

  if (error) return <div className="text-sm text-red-600">{error}</div>;

  if (!visible || !currentAd || !currentAsset || !currentUrl)
    return (
      <div className="w-full h-[calc(100vh-80px)] flex items-center justify-center">
        <Spinner className="h-16 w-16" />
      </div>
    );

  return (
    <div className="w-screen h-screen overflow-hidden flex items-center justify-center">
      {currentAd.type === "IMAGE" ? (
        <img
          src={currentUrl}
          alt={`Ad ${currentAd.advertisementId}`}
          className="w-full h-full object-contain"
          onError={nextAsset}
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
          onEnded={nextAsset}
          onError={nextAsset}
        />
      )}
    </div>
  );
};
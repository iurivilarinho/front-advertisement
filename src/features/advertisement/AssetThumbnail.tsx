import { useEffect, useRef, useState } from "react";
import { useAdAssetUrl } from "../../lib/advertisementAsset";

type Props = { type: "IMAGE" | "VIDEO"; assetPath: string };

export function AssetThumbnail({ type, assetPath }: Props) {
  const assetUrl = useAdAssetUrl();
  const [src, setSrc] = useState<string>("");
  const [videoErr, setVideoErr] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const url = await assetUrl(assetPath);
      if (!cancelled) {
        setSrc(url || "");
        setVideoErr(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assetPath, assetUrl]);

  return (
    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-black/5 flex items-center justify-center">
      {type === "IMAGE" ? (
        src ? (
          <img
            src={src}
            alt="Miniatura"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-xs opacity-70">IMAGE</span>
        )
      ) : videoErr ? (
        <span className="text-xs opacity-70">VIDEO</span>
      ) : (
        <VideoPreview src={src} onError={() => setVideoErr(true)} />
      )}
    </div>
  );
}

function VideoPreview({ src, onError }: { src: string; onError: () => void }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
  }, [src]);

  useEffect(() => {
    const v = ref.current;
    if (!v || !src) return;

    let cancelled = false;

    const run = async () => {
      try {
        v.muted = true;
        v.volume = 0;
        v.playsInline = true;

        // força carregar dados suficientes pra renderizar um frame
        v.load();

        await new Promise<void>((resolve, reject) => {
          const onLoadedData = () => {
            v.removeEventListener("loadeddata", onLoadedData);
            v.removeEventListener("error", onErr);
            resolve();
          };
          const onErr = () => {
            v.removeEventListener("loadeddata", onLoadedData);
            v.removeEventListener("error", onErr);
            reject(new Error("video error"));
          };
          v.addEventListener("loadeddata", onLoadedData);
          v.addEventListener("error", onErr);
        });

        // tenta ir para um frame inicial (nem todo codec permite seek cedo)
        try {
          v.currentTime = 0.2;
          await new Promise<void>((resolve) => {
            const onSeeked = () => {
              v.removeEventListener("seeked", onSeeked);
              resolve();
            };
            v.addEventListener("seeked", onSeeked);
            // se não seekar, segue mesmo assim
            setTimeout(() => {
              v.removeEventListener("seeked", onSeeked);
              resolve();
            }, 250);
          });
        } catch {}

        // garante frame exibido sem tocar
        v.pause();

        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) onError();
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [src, onError]);

  if (!src) return <span className="text-xs opacity-70">…</span>;

  return (
    <video
      ref={ref}
      src={src}
      className="h-full w-full object-cover"
      preload="metadata"
      muted
      playsInline
      controls={false}
      onError={onError}
      // evita “flash” antes do frame estar pronto
      style={{ opacity: ready ? 1 : 0 }}
    />
  );
}

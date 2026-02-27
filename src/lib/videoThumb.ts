// lib/videoThumb.ts
import { convertFileSrc } from "@tauri-apps/api/core";

export async function createVideoThumbnailDataUrl(
  filePath: string,
  options?: { seekSeconds?: number; maxWidth?: number; quality?: number },
): Promise<string> {
  const seekSeconds = options?.seekSeconds ?? 0.2;
  const maxWidth = options?.maxWidth ?? 320;
  const quality = options?.quality ?? 0.8;

  const url = convertFileSrc(filePath);

  return await new Promise<string>((resolve, reject) => {
    const video = document.createElement("video");
    video.src = url;
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
    };

    video.addEventListener("error", () => {
      cleanup();
      reject(new Error("Falha ao carregar vídeo para gerar miniatura."));
    });

    video.addEventListener("loadedmetadata", () => {
      const t = Math.min(
        Math.max(seekSeconds, 0),
        Math.max(0, (video.duration || 0) - 0.05),
      );
      video.currentTime = Number.isFinite(t) ? t : 0;
    });

    video.addEventListener("seeked", () => {
      const canvas = document.createElement("canvas");

      const vw = video.videoWidth || 1;
      const vh = video.videoHeight || 1;

      const scale = Math.min(1, maxWidth / vw);
      canvas.width = Math.max(1, Math.floor(vw * scale));
      canvas.height = Math.max(1, Math.floor(vh * scale));

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        cleanup();
        reject(new Error("Canvas não disponível."));
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);

      cleanup();
      resolve(dataUrl);
    });
  });
}

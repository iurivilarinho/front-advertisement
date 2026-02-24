// OverlayController.tsx
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useRef, useState } from "react";

type ExitMode = "toApp" | "toDesktop";

type Props = {
  showSeconds: number;
  intervalMinutes?: number;
  fullscreen?: boolean;
  children: (visible: boolean, exit: (mode?: ExitMode) => Promise<void>) => React.ReactNode;
};

export default function OverlayController({
  showSeconds,
  intervalMinutes = 0.5,
  fullscreen = true,
  children,
}: Props) {
  const [visible, setVisible] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const showMs = Math.max(0, showSeconds) * 1000;
    const intervalMs = Math.max(0, intervalMinutes) * 60_000;

    const w = getCurrentWindow();
    const abort = new AbortController();
    abortRef.current = abort;
    const { signal } = abort;

    const sleepAbortable = (ms: number) =>
      new Promise<void>((resolve) => {
        const id = window.setTimeout(resolve, ms);
        signal.addEventListener(
          "abort",
          () => {
            window.clearTimeout(id);
            resolve();
          },
          { once: true },
        );
      });

    const showOverlay = async () => {
      await invoke("save_foreground_window");
      await w.setAlwaysOnTop(true);
      await w.setDecorations(false);
      await w.show();
      await w.unminimize();
      if (fullscreen) await w.setFullscreen(true);
      else await w.maximize();
      await w.setFocus().catch(() => {});
      setVisible(true);
    };

    const hideOverlay = async () => {
      setVisible(false);
      await w.setFullscreen(false).catch(() => {});
      await w.hide();
      await invoke("restore_foreground_window");
    };

    (async () => {
      while (!signal.aborted) {
        await showOverlay().catch(console.error);
        await sleepAbortable(showMs);
        if (signal.aborted) break;

        await hideOverlay().catch(console.error);
        await sleepAbortable(intervalMs);
      }
    })();

    return () => abort.abort();
  }, [showSeconds, intervalMinutes, fullscreen]);

  const exit = async (mode: ExitMode = "toApp") => {
    abortRef.current?.abort();

    const w = getCurrentWindow();
    setVisible(false);

    // volta janela para modo "normal"
    await w.setFullscreen(false).catch(() => {});
    await w.setAlwaysOnTop(false).catch(() => {});
    await w.setDecorations(true).catch(() => {});
    await w.unmaximize().catch(() => {});

    if (mode === "toDesktop") {
      await w.hide().catch(() => {});
      await invoke("restore_foreground_window").catch(() => {});
      return;
    }

    // ✅ fica visível e focada para ver a rota Play
    await w.show().catch(() => {});
    await w.setFocus().catch(() => {});
  };

  return (
    <div style={{ width: "100vw", height: "100vh", background: "rgba(0,0,0,0)" }}>
      {children(visible, exit)}
    </div>
  );
}
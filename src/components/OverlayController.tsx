import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";

type Props = {
  showSeconds: number;
  intervalMinutes?: number;
  fullscreen?: boolean;
  children: (visible: boolean) => React.ReactNode;
};

export default function OverlayController({
  showSeconds,
  intervalMinutes = 0.5,
  fullscreen = true,
  children,
}: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showMs = Math.max(0, showSeconds) * 1000;
    const intervalMs = Math.max(0, intervalMinutes) * 60_000;

    const w = getCurrentWindow();
    const abort = new AbortController();
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

  return (
    <div
      style={{ width: "100vw", height: "100vh", background: "rgba(0,0,0,0)" }}
    >
      {children(visible)}
    </div>
  );
}

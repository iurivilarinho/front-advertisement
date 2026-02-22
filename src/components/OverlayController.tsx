import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";

type Props = {
  showSeconds?: number;
  intervalMinutes?: number;
  fullscreen?: boolean;
  children: React.ReactNode;
};

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export default function OverlayController({
  showSeconds = 15,
  intervalMinutes = 0.5,
  fullscreen = true,
  children,
}: Props) {
  useEffect(() => {
    const showMs = showSeconds * 1000;
    const cycleMs = Math.max(intervalMinutes * 60_000, showMs + 1000);

    let running = true;

    const showOverlay = async () => {
      const w = getCurrentWindow();

      // salva quem estava em foco (Chrome/Edge)
      await invoke("save_foreground_window");

      await w.setAlwaysOnTop(true);
      await w.setDecorations(false);

      await w.show();
      await w.unminimize();

      if (fullscreen) {
        await w.setFullscreen(true);
      } else {
        await w.maximize();
      }

      await w.setFocus().catch(() => {});
    };

    const hideOverlay = async () => {
      const w = getCurrentWindow();

      // importante: sair de fullscreen ANTES de esconder
      await w.setFullscreen(false).catch(() => {});

      await w.hide();

      // devolve foco ao navegador
      await invoke("restore_foreground_window");
    };

    const loop = async () => {
      while (running) {
        await showOverlay().catch(console.error);
        await sleep(showMs);
        await hideOverlay().catch(console.error);
        await sleep(Math.max(0, cycleMs - showMs));
      }
    };

    loop();

    const escHandler = async (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        running = false;
        await hideOverlay().catch(() => {});
      }
    };

    window.addEventListener("keydown", escHandler);

    return () => {
      running = false;
      window.removeEventListener("keydown", escHandler);
    };
  }, [showSeconds, intervalMinutes, fullscreen]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0)",
        pointerEvents: "none",
      }}
    >
      {children}
    </div>
  );
}
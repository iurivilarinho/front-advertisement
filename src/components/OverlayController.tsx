import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useRef, useState } from "react";

type ExitMode = "toApp" | "toDesktop";

type Props = {
  showSeconds: number;
  intervalMinutes?: number;
  fullscreen?: boolean;
  onHidden?: () => void;
  children: (
    visible: boolean,
    exit: (mode?: ExitMode) => Promise<void>
  ) => React.ReactNode;
};

export default function OverlayController({
  showSeconds,
  intervalMinutes = 0.5,
  fullscreen = true,
  onHidden,
  children,
}: Props) {
  const [visible, setVisible] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ✅ refs para não reiniciar o loop quando valores mudarem
  const showSecondsRef = useRef(showSeconds);
  const intervalMinutesRef = useRef(intervalMinutes);
  const fullscreenRef = useRef(fullscreen);

  useEffect(() => {
    showSecondsRef.current = showSeconds;
  }, [showSeconds]);

  useEffect(() => {
    intervalMinutesRef.current = intervalMinutes;
  }, [intervalMinutes]);

  useEffect(() => {
    fullscreenRef.current = fullscreen;
  }, [fullscreen]);

  useEffect(() => {
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
          { once: true }
        );
      });

    const showOverlay = async () => {
      await invoke("save_foreground_window");
      await w.setAlwaysOnTop(true);
      await w.setDecorations(false);
      await w.show();
      await w.unminimize();
      if (fullscreenRef.current) await w.setFullscreen(true);
      else await w.maximize();
      await w.setFocus().catch(() => {});
      setVisible(true);
    };

    const hideOverlay = async () => {
      setVisible(false);
      await w.setFullscreen(false).catch(() => {});
      await w.hide();
      await invoke("restore_foreground_window");
      onHidden?.();
    };

    (async () => {
      while (!signal.aborted) {
        // ✅ lê valores atuais aqui (não pelo dependency array)
        const showMs = Math.max(0, Number(showSecondsRef.current) || 0) * 1000;
        const intervalMs =
          Math.max(0, Number(intervalMinutesRef.current) || 0) * 60_000;

        await showOverlay().catch(console.error);
        await sleepAbortable(showMs);
        if (signal.aborted) break;

        await hideOverlay().catch(console.error);
        await sleepAbortable(intervalMs);
      }
    })();

    return () => abort.abort();
  }, [onHidden]);

  const exit = async (mode: ExitMode = "toApp") => {
    abortRef.current?.abort();

    const w = getCurrentWindow();
    setVisible(false);

    await w.setFullscreen(false).catch(() => {});
    await w.setAlwaysOnTop(false).catch(() => {});
    await w.setDecorations(true).catch(() => {});
    await w.unmaximize().catch(() => {});

    if (mode === "toDesktop") {
      await w.hide().catch(() => {});
      await invoke("restore_foreground_window").catch(() => {});
      return;
    }

    await w.show().catch(() => {});
    await w.setFocus().catch(() => {});
  };

  return (
    <div style={{ width: "100vw", height: "100vh", background: "rgba(0,0,0,0)" }}>
      {children(visible, exit)}
    </div>
  );
}




// OverlayController.tsx com transparencia
// import { invoke } from "@tauri-apps/api/core";
// import { getCurrentWindow } from "@tauri-apps/api/window";
// import { useEffect, useRef, useState } from "react";

// type ExitMode = "toApp" | "toDesktop";

// type Props = {
//   showSeconds: number;
//   intervalMinutes?: number;
//   fullscreen?: boolean;
//   onHidden?: () => void;
//   children: (
//     visible: boolean,
//     exit: (mode?: ExitMode) => Promise<void>
//   ) => React.ReactNode;
// };

// export default function OverlayController({
//   showSeconds,
//   intervalMinutes = 0.5,
//   fullscreen = true,
//   onHidden,
//   children,
// }: Props) {
//   const [visible, setVisible] = useState(false);
//   const abortRef = useRef<AbortController | null>(null);

//   // refs para não reiniciar loop quando showSeconds/interval/fullscreen mudarem
//   const showSecondsRef = useRef(showSeconds);
//   const intervalMinutesRef = useRef(intervalMinutes);
//   const fullscreenRef = useRef(fullscreen);

//   useEffect(() => {
//     showSecondsRef.current = showSeconds;
//   }, [showSeconds]);

//   useEffect(() => {
//     intervalMinutesRef.current = intervalMinutes;
//   }, [intervalMinutes]);

//   useEffect(() => {
//     fullscreenRef.current = fullscreen;
//   }, [fullscreen]);

//   useEffect(() => {
//     const w = getCurrentWindow();
//     const abort = new AbortController();
//     abortRef.current = abort;
//     const { signal } = abort;

//     const sleepAbortable = (ms: number) =>
//       new Promise<void>((resolve) => {
//         const id = window.setTimeout(resolve, ms);
//         signal.addEventListener(
//           "abort",
//           () => {
//             window.clearTimeout(id);
//             resolve();
//           },
//           { once: true }
//         );
//       });

//     const showOverlay = async () => {
//       await invoke("save_foreground_window");

//       // ✅ mostrando: remove modo transparente
//       document.body.classList.remove("overlay-hidden");

//       await w.setIgnoreCursorEvents(false).catch(() => {});
//       await w.setAlwaysOnTop(true).catch(() => {});
//       await w.setDecorations(false).catch(() => {});

//       await w.show().catch(() => {});
//       await w.unminimize().catch(() => {});

//       if (fullscreenRef.current) await w.setFullscreen(true).catch(() => {});
//       else await w.maximize().catch(() => {});

//       await w.setFocus().catch(() => {});
//       setVisible(true);
//     };

//     const hideOverlay = async () => {
//       // ✅ ocultando: ativa modo transparente (sem hide/minimize)
//       document.body.classList.add("overlay-hidden");
//       setVisible(false);

//       // mantém fullscreen (não redimensiona), só deixa clicar "atrás"
//       await w.setIgnoreCursorEvents(true).catch(() => {});
//       await w.setAlwaysOnTop(false).catch(() => {});
//       await invoke("restore_foreground_window").catch(() => {});
//       onHidden?.();
//     };

//     (async () => {
//       while (!signal.aborted) {
//         const showMs = Math.max(0, Number(showSecondsRef.current) || 0) * 1000;
//         const intervalMs =
//           Math.max(0, Number(intervalMinutesRef.current) || 0) * 60_000;

//         await showOverlay().catch(console.error);
//         await sleepAbortable(showMs);
//         if (signal.aborted) break;

//         await hideOverlay().catch(console.error);
//         await sleepAbortable(intervalMs);
//       }
//     })();

//     return () => abort.abort();
//   }, [onHidden]);

//   const exit = async (mode: ExitMode = "toApp") => {
//     // saída manual: encerra o loop e volta UI ao normal
//     document.body.classList.remove("overlay-hidden");
//     abortRef.current?.abort();

//     const w = getCurrentWindow();
//     setVisible(false);

//     await w.setFullscreen(false).catch(() => {});
//     await w.setAlwaysOnTop(false).catch(() => {});
//     await w.setDecorations(true).catch(() => {});
//     await w.setIgnoreCursorEvents(false).catch(() => {});
//     await w.unmaximize().catch(() => {});

//     if (mode === "toDesktop") {
//       await w.hide().catch(() => {});
//       await invoke("restore_foreground_window").catch(() => {});
//       return;
//     }

//     await w.show().catch(() => {});
//     await w.setFocus().catch(() => {});
//   };

//   return (
//     <div style={{ width: "100vw", height: "100vh", background: "transparent" }}>
//       {/* ✅ quando oculto, nem renderiza children */}
//       {visible ? children(visible, exit) : null}
//     </div>
//   );
// }
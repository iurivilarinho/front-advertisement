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
    exit: (mode?: ExitMode) => Promise<void>,
  ) => React.ReactNode;
};

function raf(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export default function OverlayController({
  showSeconds,
  intervalMinutes = 0.5,
  fullscreen = true,
  onHidden,
  children,
}: Props) {
  const [visible, setVisible] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

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
          { once: true },
        );
      });

    const applyOverlayVisualMask = () => {
      // esconde o conteúdo (seu CSS já torna transparente)
      document.body.classList.add("overlay-hidden");
      // esconde o cursor
      document.body.classList.add("overlay-cursor-hidden");
    };

    const removeOverlayVisualMask = () => {
      document.body.classList.remove("overlay-hidden");
      document.body.classList.remove("overlay-cursor-hidden");
    };

    const showOverlay = async () => {
      // 1) mascara visual ANTES da transição (não ver a animação de resize)
      applyOverlayVisualMask();

      await invoke("save_foreground_window").catch(() => {});
      await w.setAlwaysOnTop(true).catch(() => {});
      await w.setDecorations(false).catch(() => {});

      // opcional: overlay não recebe clique (click-through)
      // await w.setIgnoreCursorEvents(true).catch(() => {});

      // 2) transição de janela ainda "invisível"
      await w.show().catch(() => {});
      await w.unminimize().catch(() => {});
      if (fullscreenRef.current) await w.setFullscreen(true).catch(() => {});
      else await w.maximize().catch(() => {});
      await w.setFocus().catch(() => {});

      // 3) renderiza conteúdo já em fullscreen/max
      setVisible(true);

      // 4) espera pintar e volta o conteúdo normal (mantém cursor escondido)
      await raf();
      await raf();
      document.body.classList.remove("overlay-hidden");
    };

    const hideOverlay = async () => {
      // 1) mascara visual ANTES de reduzir/ocultar
      applyOverlayVisualMask();

      setVisible(false);

      // 2) sai do fullscreen e oculta
      await w.setFullscreen(false).catch(() => {});
      await w.hide().catch(() => {});
      await invoke("restore_foreground_window").catch(() => {});

      // 3) restaura tudo
      removeOverlayVisualMask();
      // await w.setIgnoreCursorEvents(false).catch(() => {});

      onHidden?.();
    };

    (async () => {
      while (!signal.aborted) {
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

    return () => {
      abort.abort();
      removeOverlayVisualMask();
      // void getCurrentWindow().setIgnoreCursorEvents(false).catch(() => {});
    };
  }, [onHidden]);

  const exit = async (mode: ExitMode = "toApp") => {
    const w = getCurrentWindow();

    // evita ver transição ao sair
    document.body.classList.add("overlay-hidden");
    document.body.classList.add("overlay-cursor-hidden");

    abortRef.current?.abort();
    setVisible(false);

    await w.setFullscreen(false).catch(() => {});
    await w.setAlwaysOnTop(false).catch(() => {});
    await w.setDecorations(true).catch(() => {});
    await w.unmaximize().catch(() => {});
    // await w.setIgnoreCursorEvents(false).catch(() => {});

    if (mode === "toDesktop") {
      await w.hide().catch(() => {});
      await invoke("restore_foreground_window").catch(() => {});
      document.body.classList.remove("overlay-hidden");
      document.body.classList.remove("overlay-cursor-hidden");
      return;
    }

    await w.show().catch(() => {});
    await w.setFocus().catch(() => {});

    await raf();
    await raf();
    document.body.classList.remove("overlay-hidden");
    document.body.classList.remove("overlay-cursor-hidden");
  };

  return (
    <div style={{ width: "100vw", height: "100vh", background: "transparent" }}>
      {children(visible, exit)}
    </div>
  );
}

// // OverlayController.tsx com transparencia
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
//       // mostra visualmente
//       document.body.classList.remove("overlay-hidden");

//       // NÃO rouba foco
//       await w.setAlwaysOnTop(true).catch(() => {});
//       await w.setIgnoreCursorEvents(true).catch(() => {});
//       await w.setDecorations(false).catch(() => {});

//       await w.show().catch(() => {});
//       await w.unminimize().catch(() => {});

//       if (fullscreenRef.current) {
//         await w.setFullscreen(true).catch(() => {});
//       } else {
//         await w.maximize().catch(() => {});
//       }

//       setVisible(true);
//     };

//     const hideOverlay = async () => {
//       // deixa transparente (não esconde a janela)
//       document.body.classList.add("overlay-hidden");
//       setVisible(false);

//       // continua ignorando mouse
//       await w.setIgnoreCursorEvents(true).catch(() => {});
//       await w.setAlwaysOnTop(false).catch(() => {});

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
//       return;
//     }

//     await w.show().catch(() => {});
//   };

//   return (
//     <div style={{ width: "100vw", height: "100vh", background: "transparent" }}>
//       {visible ? children(visible, exit) : null}
//     </div>
//   );
// }

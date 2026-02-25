// PlayerPage.tsx
import { useEffect, useState } from "react";
import OverlayController from "../../components/OverlayController";
import { Advertisement } from "./Advertisement";
import { loadAppConfig } from "../../services/iniConfig";

export function PlayerPage() {
  const [cycleSeconds, setCycleSeconds] = useState<number>(15);
  const [intervalMinutes, setIntervalMinutes] = useState<number>(0.5);

  useEffect(() => {
    let alive = true;
    loadAppConfig()
      .then((cfg) => {
        if (alive) setIntervalMinutes(cfg.intervalMinutes);
      })
      .catch(() => {
        // mantém default 0.5 se der erro
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <OverlayController
      showSeconds={cycleSeconds}
      intervalMinutes={intervalMinutes}
      fullscreen
    >
      {(visible, exit) => (
        <Advertisement
          onCycleSeconds={setCycleSeconds}
          visible={visible}
          onExit={exit}
        />
      )}
    </OverlayController>
  );
}

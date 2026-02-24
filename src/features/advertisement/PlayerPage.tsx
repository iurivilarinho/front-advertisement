// PlayerPage.tsx
import { useState } from "react";
import OverlayController from "../../components/OverlayController";
import { Advertisement } from "./Advertisement";

export function PlayerPage() {
  const [cycleSeconds, setCycleSeconds] = useState<number>(15);

  return (
    <OverlayController
      showSeconds={cycleSeconds}
      intervalMinutes={0.5}
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

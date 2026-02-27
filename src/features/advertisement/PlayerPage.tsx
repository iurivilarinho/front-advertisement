// PlayerPage.tsx
import { useCallback, useEffect, useState } from "react";
import OverlayController from "../../components/OverlayController";
import { Advertisement } from "./Advertisement";
import { loadAppConfig } from "../../services/iniConfig";

const AD_INDEX_KEY = "current-ad-index";

function getStoredAdIndex(): number {
  const raw = localStorage.getItem(AD_INDEX_KEY);
  return raw ? Number(raw) || 0 : 0;
}

function setStoredAdIndex(i: number) {
  localStorage.setItem(AD_INDEX_KEY, String(i));
}

export function PlayerPage() {
  const [cycleSeconds, setCycleSeconds] = useState<number>(15);
  const [intervalMinutes, setIntervalMinutes] = useState<number>(0.5);

  // ✅ quem manda em qual anúncio é o PlayerPage
  const [adIndex, setAdIndex] = useState<number>(getStoredAdIndex());

  useEffect(() => {
    let alive = true;
    loadAppConfig()
      .then((cfg) => {
        if (alive) setIntervalMinutes(cfg.intervalMinutes);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // ✅ o total de anúncios vem do Advertisement (depois do manifest carregar)
  const [adsCount, setAdsCount] = useState(0);

  const onHidden = useCallback(() => {
    if (adsCount <= 0) return;

    setAdIndex((prev) => {
      const next = (prev + 1) % adsCount;
      setStoredAdIndex(next);
      return next;
    });
  }, [adsCount]);

  // mantém adIndex sincronizado com storage ao montar (ou se outro lugar mexer)
  useEffect(() => {
    const stored = getStoredAdIndex();
    setAdIndex(stored);
  }, []);

  return (
    <OverlayController
      showSeconds={cycleSeconds}
      intervalMinutes={intervalMinutes}
      
      onHidden={onHidden}
    >
      {(visible, exit) => (
        <Advertisement
          adIndex={adIndex}
          onAdsCount={setAdsCount}
          onCycleSeconds={setCycleSeconds}
          visible={visible}
          onExit={exit}
        />
      )}
    </OverlayController>
  );
}

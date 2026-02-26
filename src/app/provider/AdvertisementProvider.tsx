import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AdvertisementManifest } from "../../types/advertisement";
import { pickZipAndLoadManifest } from "../../utils/loadManifestFromZip";

type AdsContextValue = {
  manifest: AdvertisementManifest | null;
  extractedRootDir: string | null;
  manifestDir: string | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const AdsContext = createContext<AdsContextValue | null>(null);

/* cache em memória do app (não recarrega ao trocar de página) */
let cached:
  | {
      manifest: AdvertisementManifest;
      extractedRootDir: string;
      manifestDir: string;
    }
  | null = null;

export function AdvertisementProvider({ children }: { children: React.ReactNode }) {
  const [manifest, setManifest] = useState<AdvertisementManifest | null>(cached?.manifest ?? null);
  const [extractedRootDir, setExtractedRootDir] = useState<string | null>(cached?.extractedRootDir ?? null);
  const [manifestDir, setManifestDir] = useState<string | null>(cached?.manifestDir ?? null);

  const [loading, setLoading] = useState<boolean>(!cached);
  const [error, setError] = useState<string | null>(null);

  const loadOnce = async () => {
    setLoading(true);
    setError(null);

    try {
      if (cached) {
        setManifest(cached.manifest);
        setExtractedRootDir(cached.extractedRootDir);
        setManifestDir(cached.manifestDir);
        return;
      }

      const result = await pickZipAndLoadManifest();

      cached = {
        manifest: result.manifest,
        extractedRootDir: result.extractedRootDir,
        manifestDir: result.manifestDir,
      };

      setManifest(result.manifest);
      setExtractedRootDir(result.extractedRootDir);
      setManifestDir(result.manifestDir);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar anúncios.");
    } finally {
      setLoading(false);
    }
  };

  const reload = async () => {
    cached = null;
    await loadOnce();
  };

  useEffect(() => {
    void loadOnce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AdsContextValue>(
    () => ({
      manifest,
      extractedRootDir,
      manifestDir,
      loading,
      error,
      reload,
    }),
    [manifest, extractedRootDir, manifestDir, loading, error]
  );

  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}

export function useAdvertisements() {
  const ctx = useContext(AdsContext);
  if (!ctx) throw new Error("useAdvertisements must be used within AdvertisementProvider");
  return ctx;
}
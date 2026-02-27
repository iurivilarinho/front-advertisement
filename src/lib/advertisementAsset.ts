import { convertFileSrc } from "@tauri-apps/api/core";
import { join } from "@tauri-apps/api/path";
import { useCallback } from "react";
import { useAdvertisements } from "../app/provider/AdvertisementProvider";

export function useAdAssetUrl() {
  const { extractedRootDir, manifestDir } = useAdvertisements();

  return useCallback(
    async (assetPath: string): Promise<string> => {
      if (!extractedRootDir) return "";
      const abs = await join(
        extractedRootDir,
        ...(manifestDir ? manifestDir.split("/") : []),
        ...assetPath.split("/")
      );
      return convertFileSrc(abs.replaceAll("\\", "/"));
    },
    [extractedRootDir, manifestDir]
  );
}
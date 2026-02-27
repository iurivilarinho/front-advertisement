// PlayAdvertisement.tsx (refatorado para usar o componente separado)
import { invoke } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Button } from "../../components/button/button";
import { FieldDescription, FieldGroup, FieldLegend, FieldSet } from "../../components/input/Field";
import { useAdvertisements } from "../../app/provider/AdvertisementProvider";
import { AdvertisementsTodaySection } from "./AdvertisementsTodaySection";

async function openOverlayAndHideMain() {
  await invoke("ensure_overlay_window");
  const overlay = await WebviewWindow.getByLabel("overlay");
  if (!overlay) throw new Error("overlay window não encontrada");

  const main = getCurrentWindow();
  await main.hide();

  await overlay.show();
  await overlay.unminimize();
}

export const PlayAdvertisement = () => {
  const { manifest, loading, error, reload } = useAdvertisements();

  return (
    <main className="w-full h-full py-10 px-4 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-6xl">
        <FieldGroup className="space-y-8">
          <FieldSet>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <FieldLegend>Exibição de Anúncios</FieldLegend>
                <FieldDescription>
                  Lista de anúncios que serão exibidos hoje (conforme o manifest carregado).
                </FieldDescription>
              </div>

              <div className="shrink-0 flex gap-2">
                <Button type="button" onClick={() => void reload()} className="gap-2" variant="secondary">
                  Recarregar
                </Button>

                <Button type="button" onClick={() => void openOverlayAndHideMain()} className="gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border">▶</span>
                  Play
                </Button>
              </div>
            </div>
          </FieldSet>

          <AdvertisementsTodaySection manifest={manifest ?? null} loading={loading} error={error ?? null} />
        </FieldGroup>
      </div>
    </main>
  );
};
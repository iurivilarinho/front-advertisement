import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../app/routers/routes";

export const PlayAdvertisement = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen flex-col px-6 py-10">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <span className="text-lg font-semibold">AD</span>
            </div>
            <div className="leading-tight">
              <p className="text-sm text-slate-300">Painel de Propagandas</p>
              <h1 className="text-base font-semibold tracking-tight">
                Modo Exibição
              </h1>
            </div>
          </div>

          <span className="hidden rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-400/20 md:inline-flex">
            Pronto para iniciar
          </span>
        </header>

        {/* Hero */}
        <section className="mt-10 grid gap-6 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Inicie a rotação de anúncios quando você quiser
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300 md:text-base">
              Clique em <span className="font-medium text-slate-100">Play</span>{" "}
              para abrir o modo de exibição em tela cheia e começar a
              alternância automática das propagandas.
            </p>

            {/* Actions */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => navigate(ROUTES.player)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-300/30 transition hover:bg-emerald-400 active:scale-[0.99]"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-slate-950/10">
                  ▶
                </span>
                Play (iniciar propagandas)
              </button>

              <button
                type="button"
                onClick={() => navigate("/settings")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 ring-1 ring-white/10 transition hover:bg-white/10 active:scale-[0.99]"
              >
                Ajustes
              </button>
            </div>

            {/* Hints */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                <p className="text-xs font-semibold text-slate-200">
                  Dica de uso
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Use <span className="font-medium text-slate-100">ESC</span>{" "}
                  para sair do fullscreen.
                </p>
              </div>
              <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                <p className="text-xs font-semibold text-slate-200">Operação</p>
                <p className="mt-1 text-sm text-slate-300">
                  A rotação inicia somente após clicar em Play.
                </p>
              </div>
            </div>
          </div>

          {/* Preview card */}
          <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-100">
                Pré-visualização
              </p>
              <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 ring-1 ring-white/10">
                player
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl bg-gradient-to-br from-white/10 to-white/5 p-4 ring-1 ring-white/10">
                <p className="text-xs text-slate-300">Status do modo</p>
                <p className="mt-1 text-base font-semibold text-slate-100">
                  Aguardando Play
                </p>
                <div className="mt-3 h-2 w-full rounded-full bg-white/5">
                  <div className="h-2 w-[35%] rounded-full bg-emerald-500/70" />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                  <p className="text-xs text-slate-300">Intervalo</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">
                    0.5 min
                  </p>
                </div>
                <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                  <p className="text-xs text-slate-300">Tela</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">
                    Fullscreen
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                <p className="text-xs font-semibold text-slate-200">
                  Observação
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Se quiser impedir que o player rode ao abrir o app, mantenha o
                  Overlay/Advertisement apenas na rota{" "}
                  <code className="rounded bg-black/20 px-1.5 py-0.5 text-xs text-slate-200">
                    /player
                  </code>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-auto pt-10 text-xs text-slate-400">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Atalho: <span className="text-slate-200">ESC</span> sai do modo
              tela cheia.
            </p>
            <p className="text-slate-500">
              Home → Play → /player (propagandas)
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
};

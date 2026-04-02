"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { LoginCard } from "@/components/dashboard/LoginCard";
import { ProfileView } from "@/components/dashboard/ProfileView";
import { SettingsModal } from "@/components/dashboard/SettingsModal";
import { TournamentCard } from "@/components/dashboard/TournamentCard";
import { I18N } from "@/constants/i18n";
import { ActiveView, DashboardResponse, DrawResponse, Language, ThemeMode } from "@/types/dashboard";

const STORAGE_QUERY = "bad_app.sessionQuery";
const STORAGE_LANGUAGE = "bad_app.language";
const STORAGE_THEME = "bad_app.theme";

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [draws, setDraws] = useState<Record<string, DrawResponse>>({});
  const [loadingDraw, setLoadingDraw] = useState<Record<string, boolean>>({});
  const [activeDrawByTournament, setActiveDrawByTournament] = useState<Record<string, string>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>("home");
  const [language, setLanguage] = useState<Language>("es");
  const [theme, setTheme] = useState<ThemeMode>("dark-ocean");
  const [draftLanguage, setDraftLanguage] = useState<Language>("es");
  const [draftTheme, setDraftTheme] = useState<ThemeMode>("dark-ocean");
  const [bootstrapped, setBootstrapped] = useState(false);

  const txt = I18N[language];
  const appThemeClass = `theme-${theme}`;
  const canSearch = useMemo(() => query.trim().length > 0 && !loading, [loading, query]);

  useEffect(() => {
    const savedLanguage = localStorage.getItem(STORAGE_LANGUAGE);
    if (savedLanguage === "es" || savedLanguage === "en") {
      setLanguage(savedLanguage);
      setDraftLanguage(savedLanguage);
    }

    const savedTheme = localStorage.getItem(STORAGE_THEME);
    if (savedTheme === "dark-ocean" || savedTheme === "dark-forest" || savedTheme === "light") {
      setTheme(savedTheme);
      setDraftTheme(savedTheme);
    }

    const savedQuery = localStorage.getItem(STORAGE_QUERY);
    if (savedQuery) {
      setQuery(savedQuery);
      void fetchDashboard(savedQuery, false);
    }

    setBootstrapped(true);
  }, []);

  useEffect(() => {
    if (!bootstrapped) return;
    localStorage.setItem(STORAGE_LANGUAGE, language);
  }, [bootstrapped, language]);

  useEffect(() => {
    if (!bootstrapped) return;
    localStorage.setItem(STORAGE_THEME, theme);
  }, [bootstrapped, theme]);

  function renderExternalLabel(label: string) {
    return (
      <>
        <span>{label}</span>
        <span className="external-link-icon" aria-hidden>
          ↗
        </span>
      </>
    );
  }

  async function loadDraw(drawUrl: string, tournamentId: string) {
    if (!data?.playerName) return;
    if (draws[drawUrl]) {
      setActiveDrawByTournament((previous) => ({ ...previous, [tournamentId]: drawUrl }));
      return;
    }

    setLoadingDraw((previous) => ({ ...previous, [drawUrl]: true }));
    try {
      const response = await fetch(
        `/api/draw?drawUrl=${encodeURIComponent(drawUrl)}&playerName=${encodeURIComponent(data.playerName)}`,
      );
      const payload = (await response.json()) as DrawResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo cargar el cuadro");
      }

      setDraws((previous) => ({ ...previous, [drawUrl]: payload }));
      setActiveDrawByTournament((previous) => ({ ...previous, [tournamentId]: drawUrl }));
    } catch (drawError) {
      const message = drawError instanceof Error ? drawError.message : "Error al cargar cuadro";
      setError(message);
    } finally {
      setLoadingDraw((previous) => ({ ...previous, [drawUrl]: false }));
    }
  }

  async function fetchDashboard(normalized: string, persistSession: boolean) {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/player-dashboard?query=${encodeURIComponent(normalized)}`);
      const payload = (await response.json()) as DashboardResponse & { error?: string };

      if (!response.ok) {
        setData(null);
        setError(payload.error ?? "No se pudo cargar la información del jugador.");
        return;
      }

      setData(payload);
      setQuery(normalized);
      setDraws({});
      setLoadingDraw({});
      setActiveDrawByTournament({});
      if (persistSession) {
        localStorage.setItem(STORAGE_QUERY, normalized);
      }
    } catch {
      setData(null);
      setError("Error de red al consultar badminton.es");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = query.trim();
    if (!normalized) return;
    await fetchDashboard(normalized, true);
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_QUERY);
    setData(null);
    setDraws({});
    setLoadingDraw({});
    setActiveDrawByTournament({});
    setError(null);
    setProfileMenuOpen(false);
    setActiveView("home");
  }

  if (!bootstrapped) {
    return <div className="min-h-screen bg-main-gradient" />;
  }

  return (
    <div
      className={`min-h-screen bg-main-gradient ${appThemeClass} ${theme === "light" ? "text-slate-900" : "text-stone-100"}`}
    >
      {data ? (
        <DashboardHeader
          playerName={data.playerName}
          txt={txt}
          activeView={activeView}
          setActiveView={setActiveView}
          profileMenuOpen={profileMenuOpen}
          setProfileMenuOpen={setProfileMenuOpen}
          onOpenSettings={() => {
            setDraftLanguage(language);
            setDraftTheme(theme);
            setSettingsOpen(true);
            setProfileMenuOpen(false);
          }}
          onLogout={handleLogout}
        />
      ) : null}

      <main className={`mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 md:px-8 md:py-12 ${data ? "pt-32 md:pt-36" : ""}`}>
        {!data ? (
          <LoginCard
            txt={txt}
            query={query}
            loading={loading}
            canSearch={canSearch}
            error={error}
            onQueryChange={setQuery}
            onSubmit={onSubmit}
          />
        ) : (
          <>
            <SettingsModal
              open={settingsOpen}
              txt={txt}
              draftLanguage={draftLanguage}
              draftTheme={draftTheme}
              language={language}
              theme={theme}
              setDraftLanguage={setDraftLanguage}
              setDraftTheme={setDraftTheme}
              onCancel={() => {
                setDraftLanguage(language);
                setDraftTheme(theme);
                setSettingsOpen(false);
              }}
              onSave={() => {
                setLanguage(draftLanguage);
                setTheme(draftTheme);
                setSettingsOpen(false);
              }}
            />

            {error ? <p className="rounded-xl bg-red-500/20 p-3 text-sm text-red-200">{error}</p> : null}
            {data.note ? <p className="rounded-xl bg-amber-500/20 p-3 text-sm text-amber-100">{data.note}</p> : null}

            <section className="grid gap-4 md:grid-cols-3">
              {activeView === "profile" ? (
                <ProfileView data={data} txt={txt} renderExternalLabel={renderExternalLabel} />
              ) : null}

              {activeView === "home" ? (
                <article className="info-card animate-rise-delay-2 rounded-2xl p-5 md:col-span-3">
                  <p className="card-label">{txt.upcoming}</p>
                  {data.upcomingTournaments.length > 0 ? (
                    <div className="mt-3 space-y-4">
                      {data.upcomingTournaments.map((tournament) => {
                        const activeDrawUrl = activeDrawByTournament[tournament.id];
                        const activeDraw = activeDrawUrl ? draws[activeDrawUrl] : undefined;
                        return (
                          <TournamentCard
                            key={tournament.id}
                            tournament={tournament}
                            txt={txt}
                            loadingDraw={loadingDraw}
                            activeDrawUrl={activeDrawUrl}
                            activeDraw={activeDraw}
                            playerName={data.playerName}
                            showMatches
                            onLoadDraw={loadDraw}
                            renderExternalLabel={renderExternalLabel}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-stone-300">No hay torneos próximos visibles en el perfil.</p>
                  )}
                </article>
              ) : null}

              {activeView === "previous" ? (
                <article className="info-card animate-rise-delay rounded-2xl p-5 md:col-span-3">
                  <p className="card-label">{txt.previous}</p>
                  {data.previousTournaments.length > 0 ? (
                    <div className="mt-3 space-y-4">
                      {data.previousTournaments.map((tournament) => {
                        const activeDrawUrl = activeDrawByTournament[tournament.id];
                        const activeDraw = activeDrawUrl ? draws[activeDrawUrl] : undefined;
                        return (
                          <TournamentCard
                            key={`past-${tournament.id}`}
                            tournament={tournament}
                            txt={txt}
                            loadingDraw={loadingDraw}
                            activeDrawUrl={activeDrawUrl}
                            activeDraw={activeDraw}
                            playerName={data.playerName}
                            showMatches={false}
                            onLoadDraw={loadDraw}
                            renderExternalLabel={renderExternalLabel}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-stone-300">No se han detectado torneos anteriores en el perfil.</p>
                  )}
                </article>
              ) : null}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

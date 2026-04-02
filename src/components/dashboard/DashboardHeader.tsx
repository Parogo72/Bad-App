import { useState } from "react";
import { ActiveView, Language, ThemeMode } from "@/types/dashboard";

type DashboardHeaderProps = {
  playerName: string | null;
  txt: Record<string, string>;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  profileMenuOpen: boolean;
  setProfileMenuOpen: (value: boolean) => void;
  onOpenSettings: () => void;
  onLogout: () => void;
};

export function DashboardHeader({
  playerName,
  txt,
  activeView,
  setActiveView,
  profileMenuOpen,
  setProfileMenuOpen,
  onOpenSettings,
  onLogout,
}: DashboardHeaderProps) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <header className="app-nav fixed inset-x-0 top-0 z-[90] border-b border-white/10">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-3 md:px-8">
        <div className="min-w-0">
          <p className="card-label text-xs sm:text-sm">{txt.appTitle}</p>
          <p className="truncate text-xs sm:text-sm opacity-85">{playerName}</p>
        </div>

        {/* Desktop nav */}
        <nav className="hidden gap-2 md:flex">
          <button
            type="button"
            onClick={() => setActiveView("home")}
            className={`chip-action ${activeView === "home" ? "chip-action-active" : ""}`}
          >
            {txt.navHome}
          </button>
          <button
            type="button"
            onClick={() => setActiveView("previous")}
            className={`chip-action ${activeView === "previous" ? "chip-action-active" : ""}`}
          >
            {txt.navPrevious}
          </button>
        </nav>

        {/* Mobile nav hamburger */}
        <div className="relative md:hidden">
          <button
            type="button"
            onClick={() => setNavOpen(!navOpen)}
            className="rounded-lg p-2 hover:bg-white/10"
            aria-label="Menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {navOpen && (
            <div className="absolute left-0 z-20 mt-2 w-40 rounded-lg bg-white/10 p-1 backdrop-blur-md">
              <button
                type="button"
                onClick={() => {
                  setActiveView("home");
                  setNavOpen(false);
                }}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                  activeView === "home" ? "bg-white/20" : "hover:bg-white/10"
                }`}
              >
                {txt.navHome}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveView("previous");
                  setNavOpen(false);
                }}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                  activeView === "previous" ? "bg-white/20" : "hover:bg-white/10"
                }`}
              >
                {txt.navPrevious}
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="chip-action"
          >
            {txt.profile}
          </button>
          {profileMenuOpen ? (
            <div className="profile-menu absolute right-0 z-20 mt-2 w-52 rounded-xl p-2 text-sm shadow-2xl">
              <button
                type="button"
                onClick={() => {
                  setActiveView("profile");
                  setProfileMenuOpen(false);
                }}
                className="w-full rounded-lg px-3 py-2 text-left hover:bg-white/10"
              >
                {txt.viewProfile}
              </button>
              <button
                type="button"
                onClick={onOpenSettings}
                className="w-full rounded-lg px-3 py-2 text-left hover:bg-white/10"
              >
                {txt.settings}
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="logout-option w-full rounded-lg px-3 py-2 text-left"
              >
                {txt.logout}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

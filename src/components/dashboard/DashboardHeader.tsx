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
  return (
    <header className="app-nav fixed inset-x-0 top-0 z-[90] border-b border-white/10">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 md:px-8">
        <div className="min-w-0">
          <p className="card-label">{txt.appTitle}</p>
          <p className="text-sm opacity-85">{playerName}</p>
        </div>
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

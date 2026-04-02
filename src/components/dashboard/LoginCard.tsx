import { FormEvent } from "react";

type LoginCardProps = {
  txt: Record<string, string>;
  query: string;
  loading: boolean;
  canSearch: boolean;
  error: string | null;
  onQueryChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function LoginCard({
  txt,
  query,
  loading,
  canSearch,
  error,
  onQueryChange,
  onSubmit,
}: LoginCardProps) {
  return (
    <section className="hero-card animate-rise mx-auto w-full max-w-2xl rounded-2xl sm:rounded-3xl">
      <p className="kicker text-xs sm:text-sm">{txt.appTitle}</p>
      <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl md:text-5xl">{txt.loginTitle}</h1>
      <p className="mt-3 max-w-3xl text-xs sm:text-sm md:text-base">{txt.loginSubtitle}</p>

      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-2 sm:gap-3 sm:mt-6 md:flex-row md:items-end">
        <label className="flex-1 text-xs sm:text-sm font-semibold">
          {txt.loginLabel}
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={txt.loginPlaceholder}
            className="mt-2 w-full rounded-xl sm:rounded-2xl border border-white/20 bg-black/20 px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base outline-none ring-0 transition focus:border-cyan-300"
          />
        </label>
        <button
          type="submit"
          disabled={!canSearch}
          className="rounded-xl sm:rounded-2xl bg-cyan-300 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? txt.loading : txt.loginButton}
        </button>
      </form>

      {error ? <p className="mt-3 sm:mt-4 rounded-lg sm:rounded-xl bg-red-500/20 p-2 sm:p-3 text-xs sm:text-sm text-red-200">{error}</p> : null}
    </section>
  );
}

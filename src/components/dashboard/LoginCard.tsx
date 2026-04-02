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
    <section className="hero-card animate-rise mx-auto w-full max-w-2xl rounded-3xl p-6 md:p-10">
      <p className="kicker">{txt.appTitle}</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">{txt.loginTitle}</h1>
      <p className="mt-4 max-w-3xl text-sm md:text-base">{txt.loginSubtitle}</p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3 md:flex-row md:items-end">
        <label className="flex-1 text-sm font-semibold">
          {txt.loginLabel}
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={txt.loginPlaceholder}
            className="mt-2 w-full rounded-2xl border border-white/20 bg-black/20 px-4 py-3 text-base outline-none ring-0 transition focus:border-cyan-300"
          />
        </label>
        <button
          type="submit"
          disabled={!canSearch}
          className="rounded-2xl bg-cyan-300 px-6 py-3 font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? txt.loading : txt.loginButton}
        </button>
      </form>

      {error ? <p className="mt-4 rounded-xl bg-red-500/20 p-3 text-sm text-red-200">{error}</p> : null}
    </section>
  );
}

import { DrawPanel } from "@/components/dashboard/DrawPanel";
import { MatchVsCard } from "@/components/dashboard/MatchVsCard";
import { DrawResponse, Tournament } from "@/types/dashboard";

type TournamentCardProps = {
  tournament: Tournament;
  txt: Record<string, string>;
  loadingDraw: Record<string, boolean>;
  activeDrawUrl?: string;
  activeDraw?: DrawResponse;
  playerName: string | null;
  showMatches: boolean;
  onLoadDraw: (drawUrl: string, tournamentId: string) => void;
  renderExternalLabel: (label: string) => React.ReactNode;
};

function getUniqueDraws(tournament: Tournament) {
  const seen = new Set<string>();
  return tournament.matches.filter((match) => {
    if (!match.drawUrl || seen.has(match.drawUrl)) return false;
    seen.add(match.drawUrl);
    return true;
  });
}

export function TournamentCard({
  tournament,
  txt,
  loadingDraw,
  activeDrawUrl,
  activeDraw,
  playerName,
  showMatches,
  onLoadDraw,
  renderExternalLabel,
}: TournamentCardProps) {
  const uniqueDraws = getUniqueDraws(tournament);

  return (
    <div className="tournament-card rounded-xl p-4">
      <div className="tournament-head">
        <div>
          <h3 className="text-base sm:text-lg md:text-xl font-bold">{tournament.name}</h3>
          <p className="text-xs sm:text-sm text-stone-300">{tournament.location || "Ubicación pendiente"}</p>
          <div className="tournament-meta">
            <p className="status-pill inline-block rounded-full bg-cyan-400/20 px-3 py-1 text-xs font-bold text-cyan-100">
              {txt.status}: {tournament.status}
            </p>
            {tournament.lastUpdated ? (
              <p className="text-xs text-stone-400">Última actualización: {tournament.lastUpdated}</p>
            ) : null}
          </div>
        </div>
        <div className="tournament-actions flex flex-wrap gap-2">
          <a href={tournament.tournamentUrl} target="_blank" rel="noreferrer" className="chip-link">
            {renderExternalLabel("Torneo")}
          </a>
          <a href={tournament.matchesUrl} target="_blank" rel="noreferrer" className="chip-link">
            {renderExternalLabel("Partidos")}
          </a>
          {tournament.playerTournamentUrl ? (
            <a href={tournament.playerTournamentUrl} target="_blank" rel="noreferrer" className="chip-link">
              {renderExternalLabel("Mi ficha torneo")}
            </a>
          ) : null}
        </div>
      </div>

      {showMatches ? (
        tournament.matches.length > 0 ? (
          <div className="match-grid mt-5 grid gap-3 md:grid-cols-2">
            {tournament.matches.map((match, index) => (
              <div key={`${tournament.id}-${match.drawName}-${index}`} className="match-card rounded-lg p-3">
                <p className="text-xs uppercase tracking-wide text-cyan-200">{match.category}</p>
                <p className="text-sm font-semibold">{match.drawName}</p>
                <p className="text-sm text-stone-300">{match.schedule}</p>
                <MatchVsCard
                  ownSide={match.ownSide}
                  opponentSide={match.opponentSide}
                  result={match.result}
                  winner={match.winner}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-stone-300">No hay partidos cargados en este torneo para tu ficha de jugador.</p>
        )
      ) : null}

      {uniqueDraws.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-cyan-200">Cuadros</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {uniqueDraws.map((drawMatch, idx) => (
              <button
                key={`${tournament.id}-${drawMatch.drawUrl}`}
                type="button"
                onClick={() => onLoadDraw(drawMatch.drawUrl, tournament.id)}
                className="chip-action"
              >
                {loadingDraw[drawMatch.drawUrl] ? "Cargando..." : `${drawMatch.category} ${idx + 1} - ${drawMatch.drawName}`}
              </button>
            ))}
          </div>

          {activeDrawUrl && activeDraw ? <DrawPanel key={activeDrawUrl} draw={activeDraw} playerName={playerName} /> : null}
        </div>
      ) : null}
    </div>
  );
}

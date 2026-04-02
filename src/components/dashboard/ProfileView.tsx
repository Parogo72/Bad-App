import { MatchVsCard } from "@/components/dashboard/MatchVsCard";
import { PushNotificationsCard } from "@/components/dashboard/PushNotificationsCard";
import { DashboardResponse } from "@/types/dashboard";

type ProfileViewProps = {
  data: DashboardResponse;
  txt: Record<string, string>;
  renderExternalLabel: (label: string) => React.ReactNode;
};

export function ProfileView({ data, txt, renderExternalLabel }: ProfileViewProps) {
  return (
    <>
      <article className="info-card animate-rise-delay rounded-xl sm:rounded-2xl md:col-span-2">
        <p className="card-label text-xs sm:text-sm">{txt.player}</p>
        <h2 className="mt-2 text-lg sm:text-2xl font-extrabold">{data.playerName ?? "Perfil sin nombre"}</h2>
        <p className="mt-2 text-xs sm:text-sm text-stone-300">Consulta: {data.query}</p>
        <p className="mt-1 text-xs sm:text-sm text-stone-300">Perfil: {data.resolvedProfileId ?? "No resuelto"}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {data.profileOverviewUrl ? (
            <a href={data.profileOverviewUrl} target="_blank" rel="noreferrer" className="chip-link">
              {renderExternalLabel("Perfil oficial")}
            </a>
          ) : null}
          {data.profileMatchesUrl ? (
            <a href={data.profileMatchesUrl} target="_blank" rel="noreferrer" className="chip-link">
              {renderExternalLabel("Historial de partidos")}
            </a>
          ) : null}
        </div>
      </article>

      <article className="info-card animate-rise-delay rounded-2xl p-5 md:col-span-3">
        <p className="card-label">{txt.profileOverview}</p>
        {data.profileStats ? (
          <div className="season-overview-wrap mt-3 overflow-x-auto rounded-lg border border-white/15 bg-white/5 p-2">
            <table className="season-overview-table min-w-full text-left text-xs md:text-sm">
              <thead>
                <tr>
                  <th className="px-2 py-1">Periodo</th>
                  <th className="px-2 py-1">Balance global (V-D)</th>
                  {data.profileStats.disciplines.map((discipline) => (
                    <th key={`head-${discipline.discipline}`} className="px-2 py-1">
                      {discipline.discipline}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-white/10">
                  <td className="px-2 py-1 font-semibold">Total acumulado</td>
                  <td className="px-2 py-1 font-semibold">
                    {data.profileStats.disciplines.reduce((acc, d) => acc + d.totalWon, 0)}-
                    {data.profileStats.disciplines.reduce((acc, d) => acc + d.totalLost, 0)}
                  </td>
                  {data.profileStats.disciplines.map((discipline) => (
                    <td key={`total-${discipline.discipline}`} className="px-2 py-1">
                      {discipline.totalWon}-{discipline.totalLost}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-white/10">
                  <td className="px-2 py-1 font-semibold">Temporada actual</td>
                  <td className="px-2 py-1 font-semibold">
                    {data.profileStats.seasonCurrent.won}-{data.profileStats.seasonCurrent.lost}
                  </td>
                  {data.profileStats.disciplines.map((discipline) => (
                    <td key={`current-${discipline.discipline}`} className="px-2 py-1">
                      {discipline.currentWon}-{discipline.currentLost}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-stone-300">No se pudieron extraer estadísticas de temporada.</p>
        )}
      </article>

      <article className="info-card animate-rise-delay rounded-2xl p-5 md:col-span-3">
        <p className="card-label">{txt.rankingNow}</p>
        {data.rankingEntries.length > 0 ? (
          <div className="mt-3 overflow-x-auto rounded-lg border border-white/15 bg-white/5 p-2">
            <table className="min-w-full text-left text-xs md:text-sm">
              <thead>
                <tr>
                  <th className="px-2 py-1">Categoría</th>
                  <th className="px-2 py-1">Puesto</th>
                  <th className="px-2 py-1">Puntos</th>
                  <th className="px-2 py-1">Puntos totales</th>
                </tr>
              </thead>
              <tbody>
                {data.rankingEntries.map((entry) => (
                  <tr key={entry.category} className="border-t border-white/10">
                    <td className="px-2 py-1 font-semibold">{entry.category}</td>
                    <td className="px-2 py-1">{entry.rank}</td>
                    <td className="px-2 py-1">{entry.rankingPoints}</td>
                    <td className="px-2 py-1">{entry.totalPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-stone-300">No hay ranking disponible en el perfil actual.</p>
        )}
      </article>

      <article className="info-card animate-rise-delay rounded-2xl p-5 md:col-span-3">
        <p className="card-label">{txt.latest}</p>
        {data.latestCategoryMatches.length > 0 ? (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {data.latestCategoryMatches.map((match) => (
              <div key={`${match.category}-${match.schedule}`} className="latest-card rounded-xl p-4">
                <p className="category-badge">{match.category}</p>
                <p className="mt-1 text-sm font-semibold text-amber-200">{match.schedule}</p>

                <MatchVsCard
                  ownSide={match.ownSide}
                  opponentSide={match.opponentSide}
                  result={match.result}
                  winner={match.winner}
                />

                <p className="mt-2 text-xs text-stone-400">{match.tournamentName}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <a href={match.tournamentUrl} target="_blank" rel="noreferrer" className="chip-link">
                    {renderExternalLabel("Torneo")}
                  </a>
                  <a href={match.playerTournamentUrl} target="_blank" rel="noreferrer" className="chip-link">
                    {renderExternalLabel("Mi ficha torneo")}
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-stone-300">
            No se pudieron extraer partidos recientes para el último torneo mostrado por el perfil.
          </p>
        )}
      </article>

      <PushNotificationsCard query={data.query} />
    </>
  );
}

import { SidePlayers } from "@/components/dashboard/SidePlayers";

type MatchVsCardProps = {
  ownSide: string[];
  opponentSide: string[];
  result: string;
  winner: "own" | "opponent" | "unknown";
  ownLabel?: string;
  opponentLabel?: string;
};

export function MatchVsCard({
  ownSide,
  opponentSide,
  result,
  winner,
  ownLabel = "Tú",
  opponentLabel = "Rival",
}: MatchVsCardProps) {
  return (
    <div className="vs-row mt-2">
      <div className={`vs-side ${winner === "own" ? "winner" : ""}`}>
        <p className="vs-label">{ownLabel}</p>
        <div className="vs-name">
          <SidePlayers names={ownSide} />
        </div>
      </div>
      <div className="vs-center">
        <p className="vs-token">VS</p>
        <p className="vs-score">{result}</p>
      </div>
      <div className={`vs-side ${winner === "opponent" ? "winner" : ""}`}>
        <p className="vs-label">{opponentLabel}</p>
        <div className="vs-name">
          <SidePlayers names={opponentSide} />
        </div>
      </div>
    </div>
  );
}

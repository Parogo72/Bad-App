"use client";

import { CSSProperties, useRef } from "react";
import { DrawResponse } from "@/types/dashboard";

const BRACKET_MATCH_HEIGHT = 98;
const BRACKET_FIRST_ROUND_GAP = 12;

type DrawPanelProps = {
  draw: DrawResponse;
  playerName: string | null;
};

function normalizeName(value: string): string {
  return value
    .replace(/\[[^\]]+\]/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getNameTokens(value: string): string[] {
  return normalizeName(value)
    .split(" ")
    .filter((token) => token.length > 2);
}

function hasStrictPlayerMatch(candidate: string, targetName: string): boolean {
  const candidateTokens = new Set(getNameTokens(candidate));
  const targetTokens = getNameTokens(targetName);

  if (targetTokens.length === 0 || candidateTokens.size === 0) return false;

  const firstToken = targetTokens[0];

  if (targetTokens.length >= 3) {
    if (!candidateTokens.has(firstToken)) return false;
    const surnameTokens = targetTokens.slice(1);
    const surnameMatches = surnameTokens.filter((token) => candidateTokens.has(token)).length;
    return surnameMatches >= 1;
  }

  if (targetTokens.length === 2) {
    return candidateTokens.has(targetTokens[0]) && candidateTokens.has(targetTokens[1]);
  }

  return candidateTokens.has(targetTokens[0]);
}

export function DrawPanel({ draw, playerName }: DrawPanelProps) {
  const dragRef = useRef<{ active: boolean; startX: number; startScroll: number }>({
    active: false,
    startX: 0,
    startScroll: 0,
  });

  const onDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    dragRef.current = {
      active: true,
      startX: event.clientX,
      startScroll: container.scrollLeft,
    };
    container.style.cursor = "grabbing";
    container.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const onDragMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const container = event.currentTarget;
    const deltaX = event.clientX - dragRef.current.startX;
    container.scrollLeft = dragRef.current.startScroll - deltaX;
  };

  const onDragEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current.active = false;
    event.currentTarget.style.cursor = "grab";
  };

  return (
    <div className="draw-board mt-3">
      <div className="draw-board__header">
        <span className="draw-board__title">Bracket</span>
        <span className="draw-board__type">{draw.drawTypeLabel}</span>
      </div>

      {draw.rounds.length > 0 ? (
        <div
          className="draw-columns"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          onPointerLeave={onDragEnd}
        >
          {draw.rounds.map((round, roundIndex) => {
            const isElimination = draw.drawType === "elimination";
            const firstPitch = BRACKET_MATCH_HEIGHT + BRACKET_FIRST_ROUND_GAP;
            const centerPitch = firstPitch * Math.pow(2, roundIndex);
            const offset =
              isElimination && roundIndex > 0
                ? Math.round((firstPitch * (Math.pow(2, roundIndex) - 1)) / 2)
                : 0;
            const gap = isElimination ? Math.max(Math.round(centerPitch - BRACKET_MATCH_HEIGHT), 8) : 8;

            const style = {
              ["--round-offset" as string]: `${offset}px`,
              ["--round-gap" as string]: `${gap}px`,
              ["--match-height" as string]: `${BRACKET_MATCH_HEIGHT}px`,
            } as CSSProperties;

            return (
              <div
                key={round.name}
                className={`draw-column ${isElimination && roundIndex > 0 ? "has-incoming" : ""}`}
              >
                <h4 className="draw-round-title">{round.name}</h4>
                <div className={`draw-round-matches ${isElimination ? "is-elimination" : ""}`} style={style}>
                  {round.matches.map((drawMatch, index) => (
                    <div
                      key={`${round.name}-${index}`}
                      className={`draw-match ${drawMatch.highlightIn ? "path-in" : ""} ${drawMatch.highlightOut ? "path-out" : ""}`}
                    >
                      {(() => {
                        const isByeScore = /\bbye\b/i.test(drawMatch.score);
                        const isPendingScore = /pendiente/i.test(drawMatch.score);
                        const isStatusOutcome = /\b(dns|wdn|ret|wo|def|ab)\b/i.test(drawMatch.score);
                        const scoreSets = (() => {
                          if (/[a-zA-Z]/.test(drawMatch.score)) return [] as string[];

                          const explicit = [...drawMatch.score.matchAll(/(\d{1,2})\s*[-:]\s*(\d{1,2})/g)].map(
                            (match) => `${match[1]}-${match[2]}`,
                          );
                          if (explicit.length > 0) return explicit;

                          const numbers = drawMatch.score.match(/\d{1,2}/g) ?? [];
                          const pairs: string[] = [];
                          for (let i = 0; i + 1 < numbers.length; i += 2) {
                            pairs.push(`${numbers[i]}-${numbers[i + 1]}`);
                          }
                          return pairs;
                        })();

                        const scoreClass = `draw-score ${isByeScore ? "bye" : ""} ${isStatusOutcome ? "status" : ""} ${isPendingScore ? "pending" : ""} ${drawMatch.highlightOut ? "mine-win" : ""}`.trim();

                        return (
                          <>
                            {isElimination && roundIndex > 0 ? <span className="draw-incoming-line" aria-hidden /> : null}
                            {drawMatch.participants.map((participant) => (
                              <div
                                key={`${round.name}-${index}-${participant.name}`}
                                className={`draw-participant ${participant.won ? "won" : ""} ${participant.highlight ? "mine" : ""}`}
                              >
                                <span className="draw-participant__name">{participant.name}</span>
                                {participant.won ? <span className="draw-participant__badge">WIN</span> : null}
                              </div>
                            ))}
                            {scoreSets.length > 0 ? (
                              <div className={`draw-score-sets ${drawMatch.highlightOut ? "mine-win" : ""}`}>
                                {scoreSets.map((setScore, setIndex) => {
                                  const [left, right] = setScore.split("-");
                                  return (
                                    <span key={`${setScore}-${setIndex}`} className="draw-score-set">
                                      <span>{left}</span>
                                      <span className="draw-score-divider">-</span>
                                      <span>{right}</span>
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className={scoreClass}>{drawMatch.score}</div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : draw.groupStandings ? (
        <div className="overflow-x-auto">
          <p className="text-xs font-semibold text-cyan-100">{draw.groupStandings.title}</p>
          <table className="mt-2 min-w-full text-left text-xs text-stone-200">
            <thead>
              <tr>
                {draw.groupStandings.headers.map((header, index) => (
                  <th key={`${header}-${index}`} className="border-b border-white/20 px-2 py-1 text-stone-300">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {draw.groupStandings.rows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`}>
                  {row.map((value, columnIndex) => {
                    const isPlayerRow = columnIndex === 1 && playerName ? hasStrictPlayerMatch(value, playerName) : false;
                    return (
                      <td
                        key={`cell-${rowIndex}-${columnIndex}`}
                        className={`border-b border-white/10 px-2 py-1 ${isPlayerRow ? "font-bold text-cyan-200" : ""}`}
                      >
                        {value}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-stone-300">No se pudo representar este cuadro con el formato disponible.</p>
      )}
    </div>
  );
}

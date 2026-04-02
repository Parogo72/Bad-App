import * as cheerio from "cheerio";

const BADMINTON_BASE_URL = "https://www.badminton.es";

export type DrawParticipant = {
  name: string;
  won: boolean;
  highlight: boolean;
};

export type DrawMatch = {
  participants: DrawParticipant[];
  score: string;
  highlightIn: boolean;
  highlightOut: boolean;
};

export type DrawRound = {
  name: string;
  matches: DrawMatch[];
};

export type DrawData = {
  tournamentId: string;
  drawId: string;
  drawType: "elimination" | "group" | "unknown";
  drawTypeLabel: string;
  rounds: DrawRound[];
  groupStandings: {
    title: string;
    headers: string[];
    rows: string[][];
  } | null;
};

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeName(value: string): string {
  return cleanText(value)
    .replace(/\[[^\]]+\]/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
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

function detectDrawType(label: string): DrawData["drawType"] {
  const normalized = label.toLowerCase();
  if (normalized.includes("elimination") || normalized.includes("knockout")) {
    return "elimination";
  }
  if (
    normalized.includes("round robin") ||
    normalized.includes("group") ||
    normalized.includes("pool") ||
    normalized.includes("liguilla")
  ) {
    return "group";
  }
  return "unknown";
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
      "X-Requested-With": "XMLHttpRequest",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`No se pudo cargar el cuadro (${response.status})`);
  }

  return response.text();
}

export async function getDrawData(drawUrl: string, playerName: string): Promise<DrawData> {
  const parsed = new URL(drawUrl);
  const tournamentId = parsed.searchParams.get("id") ?? "";
  const drawId = parsed.searchParams.get("draw") ?? "";

  if (!tournamentId || !drawId) {
    throw new Error("URL de cuadro inválida");
  }

  const drawPageUrl = `${BADMINTON_BASE_URL}/tournament/${tournamentId.toLowerCase()}/draw/${drawId}`;
  const drawPageHtml = await fetchHtml(drawPageUrl);
  const drawPageRoot = cheerio.load(drawPageHtml);

  const drawTypeLabel =
    cleanText(drawPageRoot(".page-subhead .tag").first().text()) ||
    cleanText(drawPageRoot(".tag").first().text()) ||
    "No especificado";

  const drawContentUrl = `${BADMINTON_BASE_URL}/tournament/${tournamentId.toLowerCase()}/draw/${drawId}/GetDrawContent?tabindex=1`;
  const drawContentHtml = await fetchHtml(drawContentUrl);
  const $ = cheerio.load(drawContentHtml);

  const roundNames = $(".js-subheading")
    .toArray()
    .map((element) => cleanText($(element).text()))
    .filter(Boolean);

  const rounds: DrawRound[] = [];

  $(".bracket-round__item").each((roundIndex, roundElement) => {
    const matches: DrawMatch[] = [];

    $(roundElement)
      .find(".match")
      .each((_, matchElement) => {
        const participants: DrawParticipant[] = [];
        let highlightedParticipantWon = false;

        $(matchElement)
          .find(".match__row")
          .each((__, rowElement) => {
            const linkedNames = $(rowElement)
              .find(".match__row-title-value-content .nav-link__value")
              .toArray()
              .map((node) => cleanText($(node).text()))
              .filter(Boolean);

            const uniqueLinkedNames = [...new Set(linkedNames)];

            const name =
              (uniqueLinkedNames.length > 0 ? uniqueLinkedNames.join(" / ") : "") ||
              cleanText($(rowElement).find(".match__row-title-value-content").first().text());

            if (!name) return;

            const highlight = uniqueLinkedNames.length > 0
              ? uniqueLinkedNames.some((player) => hasStrictPlayerMatch(player, playerName))
              : hasStrictPlayerMatch(name, playerName);
            const won = $(rowElement).hasClass("has-won");

            if (highlight && won) {
              highlightedParticipantWon = true;
            }

            participants.push({
              name,
              won,
              highlight,
            });
          });

        if (participants.length === 0) return;

        const highlightIn = participants.some((participant) => participant.highlight);
        const highlightOut = highlightIn && highlightedParticipantWon;
        const rawScore = cleanText($(matchElement).find(".match__result").text());
        const matchText = cleanText($(matchElement).text());
        const statusTokenMatch = matchText.match(/\b(WDN|DNS|RET|W\.?O\.?|WO|DEF\.?|AB\.?)\b/i);
        const statusToken = statusTokenMatch?.[1]?.replace(/\./g, "").toUpperCase() ?? null;
        const hasBye =
          participants.length === 1 || participants.some((participant) => /\bbye\b/i.test(participant.name));
        let score = rawScore;

        if (!score) {
          if (hasBye) {
            score = "BYE";
          } else if (statusToken) {
            score = statusToken;
          } else if (highlightOut) {
            score = "Ganado";
          } else {
            score = "Pendiente";
          }
        }

        matches.push({ participants, score, highlightIn, highlightOut });
      });

    if (matches.length > 0) {
      rounds.push({
        name: roundNames[roundIndex] ?? `Ronda ${roundIndex + 1}`,
        matches,
      });
    }
  });

  let groupStandings: DrawData["groupStandings"] = null;
  let resolvedDrawTypeLabel = drawTypeLabel;
  let resolvedDrawType = detectDrawType(drawTypeLabel);

  if (rounds.length === 0) {
    const legacyHtml = await fetchHtml(drawUrl);
    const legacyRoot = cheerio.load(legacyHtml);
    const standingsTable = legacyRoot("table.ruler").first();

    if (standingsTable.length > 0) {
      const title =
        cleanText(standingsTable.find("caption").first().text()) ||
        cleanText(legacyRoot("h2, h3").first().text()) ||
        "Clasificación";

      const headers = standingsTable
        .find("thead tr")
        .first()
        .find("th, td")
        .toArray()
        .map((cell) => cleanText(legacyRoot(cell).text()))
        .filter(Boolean);

      const rows = standingsTable
        .find("tbody tr")
        .toArray()
        .map((row) =>
          legacyRoot(row)
            .find("td")
            .toArray()
            .map((cell) => cleanText(legacyRoot(cell).text()))
            .filter(Boolean),
        )
        .filter((row) => row.length > 0);

      if (rows.length > 0) {
        groupStandings = {
          title,
          headers,
          rows,
        };

        if (resolvedDrawType === "unknown") {
          resolvedDrawType = "group";
          resolvedDrawTypeLabel = "Liguilla / Grupo";
        }
      }
    }
  }

  return {
    tournamentId,
    drawId,
    drawType: resolvedDrawType,
    drawTypeLabel: resolvedDrawTypeLabel,
    rounds,
    groupStandings,
  };
}

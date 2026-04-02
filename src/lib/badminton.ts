import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

const BADMINTON_BASE_URL = "https://www.badminton.es";
const RANKING_RIDS = [440, 441, 442, 450, 451, 452, 453, 454, 455];
const GUID_REGEX = /[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}/i;

type TournamentPlayerMatch = {
  category: string;
  drawName: string;
  schedule: string;
  result: string;
  playerCount: 1 | 2;
  ownSide: string[];
  opponentSide: string[];
  winner: "own" | "opponent" | "unknown";
  drawUrl: string;
};

type UpcomingTournament = {
  id: string;
  name: string;
  location: string;
  tournamentUrl: string;
  drawUrl: string;
  matchesUrl: string;
  playerTournamentUrl: string | null;
  status: string;
  lastUpdated: string | null;
  matches: TournamentPlayerMatch[];
};

type PlayedTournament = {
  id: string;
  name: string;
  location: string;
  tournamentUrl: string;
  drawUrl: string;
  matchesUrl: string;
  playerTournamentUrl: string | null;
  status: string;
  lastUpdated: string | null;
  matches: TournamentPlayerMatch[];
};

type CategoryMatch = {
  category: string;
  schedule: string;
  result: string;
  playerCount: 1 | 2;
  ownSide: string[];
  opponentSide: string[];
  winner: "own" | "opponent" | "unknown";
  tournamentName: string;
  tournamentUrl: string;
  drawUrl: string;
  playerTournamentUrl: string;
};

type DisciplineStats = {
  discipline: string;
  totalPlayed: number;
  totalWon: number;
  totalLost: number;
  currentPlayed: number;
  currentWon: number;
  currentLost: number;
};

type ProfileStats = {
  disciplines: DisciplineStats[];
  seasonCurrent: { played: number; won: number; lost: number };
  seasonPrevious: { played: number; won: number; lost: number };
};

type RankingEntry = {
  category: string;
  rank: string;
  rankingPoints: string;
  totalPoints: string;
};

export type PlayerDashboard = {
  query: string;
  resolvedProfileId: string | null;
  playerName: string | null;
  profileOverviewUrl: string | null;
  profileMatchesUrl: string | null;
  upcomingTournament: UpcomingTournament | null;
  upcomingTournaments: UpcomingTournament[];
  previousTournaments: PlayedTournament[];
  latestCategoryMatches: CategoryMatch[];
  profileStats: ProfileStats | null;
  rankingEntries: RankingEntry[];
  note: string | null;
};

function parseIntSafe(value: string): number {
  const cleaned = value.replace(/[^\d-]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function parseProfileStatsAndRanking($: cheerio.CheerioAPI): {
  profileStats: ProfileStats | null;
} {
  const disciplines: DisciplineStats[] = [];

  $("div.career table.ruler").each((_, table) => {
    const caption = cleanText($(table).find("caption").first().text()) || "General";
    let totalPlayed = 0;
    let totalWon = 0;
    let totalLost = 0;
    let currentPlayed = 0;
    let currentWon = 0;
    let currentLost = 0;

    $(table)
      .find("tr")
      .each((__, row) => {
        const head = cleanText($(row).find("th").first().text()).toLowerCase();
        const values = $(row)
          .find("td")
          .toArray()
          .map((td) => cleanText($(td).text()));

        if (values.length < 3) return;

        if (head.includes("total")) {
          totalPlayed = parseIntSafe(values[0]);
          totalWon = parseIntSafe(values[1]);
          totalLost = parseIntSafe(values[2]);
        }

        if (head.includes("año actual") || head.includes("ano actual") || head.includes("current")) {
          currentPlayed = parseIntSafe(values[0]);
          currentWon = parseIntSafe(values[1]);
          currentLost = parseIntSafe(values[2]);
        }
      });

    if (totalPlayed > 0 || currentPlayed > 0) {
      disciplines.push({
        discipline: caption,
        totalPlayed,
        totalWon,
        totalLost,
        currentPlayed,
        currentWon,
        currentLost,
      });
    }
  });

  const seasonCurrent = disciplines.reduce(
    (acc, d) => {
      acc.played += d.currentPlayed;
      acc.won += d.currentWon;
      acc.lost += d.currentLost;
      return acc;
    },
    { played: 0, won: 0, lost: 0 },
  );

  const totals = disciplines.reduce(
    (acc, d) => {
      acc.played += d.totalPlayed;
      acc.won += d.totalWon;
      acc.lost += d.totalLost;
      return acc;
    },
    { played: 0, won: 0, lost: 0 },
  );

  const seasonPrevious = {
    played: Math.max(0, totals.played - seasonCurrent.played),
    won: Math.max(0, totals.won - seasonCurrent.won),
    lost: Math.max(0, totals.lost - seasonCurrent.lost),
  };

  const profileStats = disciplines.length > 0
    ? {
        disciplines,
        seasonCurrent,
        seasonPrevious,
      }
    : null;

  return { profileStats };
}

function extractLiveRankingUrl($: cheerio.CheerioAPI): string | null {
  const rankingLink = $("a[href*='/ranking/player.aspx?rid='][href*='player='], a[href*='ranking/player.aspx?rid='][href*='player=']")
    .first()
    .attr("href");

  if (!rankingLink) return null;
  return toAbsoluteUrl(rankingLink);
}

async function resolveLiveRankingUrlFromSearch(query: string, playerName: string): Promise<string | null> {
  const rid = 440;
  const rankingPageUrl = `${BADMINTON_BASE_URL}/ranking/ranking.aspx?rid=${rid}`;

  const rankingHtml = await fetchHtml(rankingPageUrl);
  const rankingId = extractRankingId(rankingHtml);
  if (!rankingId) return null;

  const searchValue = /^\d+$/.test(query) ? query : playerName;
  if (!searchValue) return null;

  const response = await fetch(`${BADMINTON_BASE_URL}/ranking/find.aspx/GetRankingPlayer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
    },
    body: JSON.stringify({
      LCID: 3082,
      RankingID: Number(rankingId),
      Value: searchValue,
    }),
    cache: "no-store",
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as { d?: unknown };
  const serialized = JSON.stringify(payload?.d ?? []);
  const playerIdMatch = serialized.match(/player=([0-9]+)/i);
  if (!playerIdMatch?.[1]) return null;

  return `${BADMINTON_BASE_URL}/ranking/player.aspx?rid=${rid}&player=${playerIdMatch[1]}`;
}

async function resolveLiveRankingUrlFromCategoryPages(
  query: string,
  playerName: string,
): Promise<string | null> {
  const rid = 440;
  const rankingPageUrl = `${BADMINTON_BASE_URL}/ranking/ranking.aspx?rid=${rid}`;
  const rankingHtml = await fetchHtml(rankingPageUrl);
  const rankingId = extractRankingId(rankingHtml);
  if (!rankingId) return null;

  const normalizedQuery = normalizeName(query);
  const normalizedPlayerName = normalizeName(playerName);
  const categoryIds = extractCategoryIds(rankingHtml);

  for (const categoryId of categoryIds) {
    const firstPageUrl = `${BADMINTON_BASE_URL}/ranking/category.aspx?id=${rankingId}&category=${categoryId}&p=1&ps=100`;
    const firstPageHtml = await fetchHtml(firstPageUrl);

    const pageUrls = new Set<string>([firstPageUrl]);
    const totalPages = Math.min(extractTotalPagesFromCategory(firstPageHtml), 20);
    for (let page = 2; page <= totalPages; page += 1) {
      pageUrls.add(`${BADMINTON_BASE_URL}/ranking/category.aspx?id=${rankingId}&category=${categoryId}&p=${page}&ps=100`);
    }

    for (const pageUrl of pageUrls) {
      const pageHtml = pageUrl === firstPageUrl ? firstPageHtml : await fetchHtml(pageUrl);
      const $ = cheerio.load(pageHtml);

      for (const row of $("table.ruler tbody tr").toArray()) {
        const cells = $(row).find("td");
        if (cells.length < 6) continue;

        const rowText = cleanText($(row).text());
        const nameCell = cleanText(cells.eq(3).text());
        const licenseCell = cleanText(cells.eq(5).text());
        const candidateName = nameCell || rowText;
        const normalizedCandidate = normalizeName(candidateName);
        const matchesQuery =
          licenseCell === query ||
          licenseCell === playerName ||
          normalizedCandidate === normalizedQuery ||
          normalizedCandidate === normalizedPlayerName ||
          normalizedCandidate.includes(normalizedQuery) ||
          normalizedCandidate.includes(normalizedPlayerName);

        if (!matchesQuery) continue;

        const playerLink = $(row).find('a[href*="player.aspx?id="][href*="player="]').first().attr("href");
        const playerMatch = playerLink?.match(/player=(\d+)/i);
        if (playerMatch?.[1]) {
          return `${BADMINTON_BASE_URL}/ranking/player.aspx?rid=${rid}&player=${playerMatch[1]}`;
        }
      }
    }
  }

  return null;
}

function parseRankingEntriesFromLiveRankingPage(html: string): RankingEntry[] {
  const $ = cheerio.load(html);
  const rankingEntries: RankingEntry[] = [];

  const summaryTable = $("table.ruler")
    .toArray()
    .find((table) => {
      const headerText = cleanText($(table).find("th.extraheader").text()).toLowerCase();
      const tableText = cleanText($(table).text()).toLowerCase();
      return (
        headerText.includes("categoría") ||
        headerText.includes("clasificación") ||
        tableText.includes("puntos totales") ||
        tableText.includes("rankingpoints")
      );
    });

  if (!summaryTable) return rankingEntries;

  $(summaryTable)
    .find("tbody tr")
    .each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length < 6) return;
      if ($(row).find("th.extraheader").length > 0) return;
      if ($(row).find("td.noruler").length > 0) return;

      const category = cleanText(cells.eq(0).text());
      if (!category) return;

      const rank = cleanText(cells.eq(1).text()) || cleanText(cells.eq(2).text());
      const rankingPoints = cleanText(cells.eq(4).text());
      const totalPoints = cleanText(cells.eq(5).text());

      if (!rank && !rankingPoints && !totalPoints) return;

      rankingEntries.push({
        category,
        rank: rank || "-",
        rankingPoints: rankingPoints || "-",
        totalPoints: totalPoints || "-",
      });
    });

  return rankingEntries;
}

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

function toAbsoluteUrl(href: string): string {
  if (!href) return BADMINTON_BASE_URL;
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  if (href.startsWith("//")) return `https:${href}`;
  try {
    return new URL(href, `${BADMINTON_BASE_URL}/`).toString();
  } catch {
    if (href.startsWith("/")) return `${BADMINTON_BASE_URL}${href}`;
    return `${BADMINTON_BASE_URL}/${href.replace(/^\.\//, "")}`;
  }
}

function resolveUrlFrom(baseUrl: string, href: string): string {
  if (!href) return baseUrl;
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  if (href.startsWith("//")) return `https:${href}`;

  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return toAbsoluteUrl(href);
  }
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractQueryParam(url: string, key: string): string {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get(key) ?? "";
  } catch {
    return "";
  }
}

function scoreNameMatch(candidate: string, targetTokens: string[]): number {
  const normalizedCandidate = normalizeName(candidate);
  let score = 0;
  for (const token of targetTokens) {
    if (normalizedCandidate.includes(token)) score += 1;
  }
  return score;
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status} al consultar ${url}`);
  }

  return response.text();
}

function extractRankingId(html: string): string | null {
  const match = html.match(/ranking\.aspx\?id=(\d+)/i);
  return match?.[1] ?? null;
}

function extractCategoryIds(html: string): string[] {
  const ids = new Set<string>();
  for (const match of html.matchAll(/category\.aspx\?id=\d+&category=(\d+)/gi)) {
    ids.add(match[1]);
  }
  return [...ids];
}

function findProfileIdForLicense(html: string, nationalId: string): string | null {
  const $ = cheerio.load(html);

  for (const row of $("tr").toArray()) {
    const cells = $(row).find("td");
    const hasLicense = cells
      .toArray()
      .some((cell) => cleanText($(cell).text()) === nationalId);

    if (!hasLicense) continue;

    const profileHref = $(row).find('a[href*="/profile/default.aspx?id="]').first().attr("href");
    if (!profileHref) continue;

    const fullProfileUrl = toAbsoluteUrl(profileHref);
    const profileId = extractQueryParam(fullProfileUrl, "id");
    if (GUID_REGEX.test(profileId)) {
      return profileId.toUpperCase();
    }
  }

  return null;
}

function extractTotalPagesFromCategory(html: string): number {
  const pageOfMatch = html.match(/Page\s+\d+\s+of\s+(\d+)/i);
  if (pageOfMatch?.[1]) {
    return Math.max(1, Number(pageOfMatch[1]));
  }

  const pagesFromScript = [...html.matchAll(/PageSelected\((\d+),\d+\)/g)].map((m) => Number(m[1]));
  if (pagesFromScript.length > 0) {
    return Math.max(1, ...pagesFromScript);
  }

  return 1;
}

async function extractProfileIdFromRankingPlayer(
  rankingId: string,
  playerId: string,
): Promise<string | null> {
  const playerPageUrl = `${BADMINTON_BASE_URL}/ranking/player.aspx?id=${rankingId}&player=${playerId}`;
  const html = await fetchHtml(playerPageUrl);
  const match = html.match(new RegExp(`/profile/default\\.aspx\\?id=(${GUID_REGEX.source})`, "i"));
  return match?.[1]?.toUpperCase() ?? null;
}

async function resolveProfileIdFromCategoryPages(
  rankingId: string,
  categoryIds: string[],
  nationalId: string,
): Promise<string | null> {
  for (const categoryId of categoryIds) {
    const firstPageUrl = `${BADMINTON_BASE_URL}/ranking/category.aspx?id=${rankingId}&category=${categoryId}&p=1&ps=100`;
    const firstPageHtml = await fetchHtml(firstPageUrl);

    const profileIdOnFirstPage = findProfileIdForLicense(firstPageHtml, nationalId);
    if (profileIdOnFirstPage) return profileIdOnFirstPage;

    const totalPages = Math.min(extractTotalPagesFromCategory(firstPageHtml), 20);
    for (let page = 2; page <= totalPages; page += 1) {
      const pageUrl = `${BADMINTON_BASE_URL}/ranking/category.aspx?id=${rankingId}&category=${categoryId}&p=${page}&ps=100`;
      const pageHtml = await fetchHtml(pageUrl);
      const profileId = findProfileIdForLicense(pageHtml, nationalId);
      if (profileId) return profileId;
    }
  }

  return null;
}

async function resolveProfileIdFromNationalId(nationalId: string): Promise<string | null> {
  const directMapRaw = process.env.BAD_PLAYER_MAP;
  if (directMapRaw) {
    try {
      const directMap = JSON.parse(directMapRaw) as Record<string, string>;
      const mapped = directMap[nationalId];
      if (mapped && GUID_REGEX.test(mapped)) {
        return mapped.toUpperCase();
      }
    } catch {
      // Ignore invalid env mapping and continue with discovery.
    }
  }

  for (const rid of RANKING_RIDS) {
    const rankingPageUrl = `${BADMINTON_BASE_URL}/ranking/ranking.aspx?rid=${rid}`;
    const rankingHtml = await fetchHtml(rankingPageUrl);

    const rowRegex = new RegExp(
      `<tr>[\\s\\S]*?<td>${escapeRegex(nationalId)}</td>[\\s\\S]*?/profile/default\\.aspx\\?id=(${GUID_REGEX.source})[\\s\\S]*?</tr>`,
      "i",
    );
    const rowMatch = rankingHtml.match(rowRegex);
    if (rowMatch?.[1]) {
      return rowMatch[1].toUpperCase();
    }

    const rankingId = extractRankingId(rankingHtml);
    if (!rankingId) continue;

    const categoryIds = extractCategoryIds(rankingHtml);
    if (categoryIds.length > 0) {
      const categoryMatchProfile = await resolveProfileIdFromCategoryPages(
        rankingId,
        categoryIds,
        nationalId,
      );
      if (categoryMatchProfile) {
        return categoryMatchProfile;
      }
    }

    const response = await fetch(`${BADMINTON_BASE_URL}/ranking/find.aspx/GetRankingPlayer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
      },
      body: JSON.stringify({
        LCID: 3082,
        RankingID: Number(rankingId),
        Value: nationalId,
      }),
      cache: "no-store",
    });

    if (!response.ok) continue;

    const json = (await response.json()) as { d?: unknown };
    const serialized = JSON.stringify(json?.d ?? []);

    const guidMatch = serialized.match(new RegExp(GUID_REGEX.source, "i"));
    if (guidMatch?.[0]) {
      return guidMatch[0].toUpperCase();
    }

    const uniquePlayerIds = new Set<string>();
    for (const match of serialized.matchAll(/player=([0-9]+)/gi)) {
      uniquePlayerIds.add(match[1]);
    }

    for (const playerId of uniquePlayerIds) {
      try {
        const profileId = await extractProfileIdFromRankingPlayer(rankingId, playerId);
        if (profileId) return profileId;
      } catch {
        // Keep trying with other player candidates.
      }
    }
  }

  return null;
}

async function resolveProfileId(query: string): Promise<string | null> {
  if (GUID_REGEX.test(query)) {
    return query.toUpperCase();
  }

  if (/^\d+$/.test(query)) {
    return resolveProfileIdFromNationalId(query);
  }

  return null;
}

function parseUpcomingTournamentSummaries($: cheerio.CheerioAPI): Array<{
  id: string;
  name: string;
  location: string;
  tournamentUrl: string;
}> {
  const summaries: Array<{ id: string; name: string; location: string; tournamentUrl: string }> = [];

  $("table.ruler")
    .not("table.matches")
    .find("tr")
    .each((_, row) => {
      const anchor = $(row).find('a[href*="/sport/tournament.aspx?id="]').first();
      if (!anchor.length) return;

      const tournamentUrl = toAbsoluteUrl(anchor.attr("href") ?? "");
      const id = extractQueryParam(tournamentUrl, "id");
      if (!id) return;

      const location = cleanText($(row).find("td").eq(1).text());
      summaries.push({
        id,
        name: cleanText(anchor.text()) || "Próximo torneo",
        location,
        tournamentUrl,
      });
    });

  return summaries;
}

function parseLastUpdatedFromTournamentPage(html: string): string | null {
  const match = html.match(/Última actualización:\s*([^<\n]+)/i);
  return match?.[1] ? cleanText(match[1]) : null;
}

function pickBestPlayerUrl($: cheerio.CheerioAPI, playerName: string): string | null {
  const tokens = getNameTokens(playerName);
  let bestHref: string | null = null;
  let bestScore = 0;

  $("a[href*='/sport/player.aspx?id='], a[href*='player.aspx?id=']").each((_, element) => {
    const href = $(element).attr("href") ?? "";
    const text = cleanText($(element).text());
    if (!href || !text) return;

    const score = scoreNameMatch(text, tokens);
    if (score === 0) return;

    if (score > bestScore) {
      bestScore = score;
      bestHref = toAbsoluteUrl(href);
    }
  });

  return bestHref;
}

function extractSideNames($: cheerio.CheerioAPI, row: AnyNode, cellIndexes: number[]): string[] {
  const names: string[] = [];
  for (const index of cellIndexes) {
    const cell = $(row).find("td").eq(index);
    if (!cell.length) continue;
    const anchors = cell.find("a[href*='player.aspx']");
    if (anchors.length > 0) {
      anchors.each((_, a) => {
        const n = cleanText($(a).text());
        if (n) names.push(n);
      });
    } else {
      const n = cleanText(cell.text());
      if (n && n !== "-") names.push(n);
    }
  }
  return [...new Set(names)];
}

function extractPlayersFromSideCell($: cheerio.CheerioAPI, cell: cheerio.Cheerio<AnyNode>): string[] {
  const players = cell
    .find("a")
    .toArray()
    .filter((a) => {
      const href = ($(a).attr("href") ?? "").toLowerCase();
      if (!href.includes("player.aspx?id=")) return false;
      if (href.includes("draw.aspx") || href.includes("teammatch.aspx") || href.includes("event.aspx")) {
        return false;
      }
      return true;
    })
    .map((a) => cleanText($(a).text()))
    .filter(Boolean);

  return [...new Set(players)];
}

function extractPlayersNearDash(
  $: cheerio.CheerioAPI,
  cells: cheerio.Cheerio<AnyNode>,
  dashIndex: number,
  fromLeft: boolean,
): string[] {
  const names: string[] = [];

  const start = fromLeft ? dashIndex - 1 : dashIndex + 1;
  const step = fromLeft ? -1 : 1;

  let blankAfterPlayers = 0;
  for (let index = start; index >= 0 && index < cells.length; index += step) {
    const cell = cells.eq(index);
    const players = extractPlayersFromSideCell($, cell);

    if (players.length > 0) {
      if (fromLeft) {
        names.unshift(...players);
      } else {
        names.push(...players);
      }
      blankAfterPlayers = 0;
      if (names.length >= 2) break;
      continue;
    }

    if (names.length > 0) {
      blankAfterPlayers += 1;
      if (blankAfterPlayers >= 1) break;
    }
  }

  return [...new Set(names)];
}

function findFirstDateCellText(cellsText: string[]): string {
  for (const value of cellsText) {
    if (/\d{2}\/\d{2}\/\d{4}/.test(value)) return value;
  }
  return "";
}

function hasTargetPlayer(side: string[], targetTokens: string[]): boolean {
  return side.some((name) => scoreNameMatch(name, targetTokens) > 0);
}

function parseScheduleToTimestamp(schedule: string): number {
  const match = schedule.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!match) return Number.NEGATIVE_INFINITY;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const hour = Number(match[4] ?? "0");
  const minute = Number(match[5] ?? "0");

  return new Date(year, month - 1, day, hour, minute).getTime();
}

function parseResultText(rowText: string, cellsText: string[]): string {
  for (const value of cellsText) {
    if (value.includes("/")) continue;
    if (/^\d{1,2}-\d{1,2}(?:\s+\d{1,2}-\d{1,2})+$/.test(value)) {
      return value;
    }
  }

  const scoreMatch = rowText.match(/(\d{1,2}-\d{1,2}\s+\d{1,2}-\d{1,2}(?:\s+\d{1,2}-\d{1,2})*)/);
  if (scoreMatch?.[1]) return cleanText(scoreMatch[1]);

  const resultToken = cellsText.find((value) => /(W\.O\.|RET|AB\.|DEF\.)/i.test(value));
  if (resultToken) return resultToken;

  return "Pendiente";
}

function orientResultToOwnSide(result: string, ownIsA: boolean): string {
  if (ownIsA) return result;
  return result.replace(/(\d{1,2})-(\d{1,2})/g, (_match, a, b) => `${b}-${a}`);
}

function getWinnerFromResult(result: string, ownOnA: boolean): "own" | "opponent" | "unknown" {
  const sets = [...result.matchAll(/(\d{1,2})-(\d{1,2})/g)];
  if (sets.length === 0) return "unknown";

  let winsA = 0;
  let winsB = 0;
  for (const set of sets) {
    const a = Number(set[1]);
    const b = Number(set[2]);
    if (a > b) winsA += 1;
    if (b > a) winsB += 1;
  }

  if (winsA === winsB) return "unknown";
  const winnerSide = winsA > winsB ? "A" : "B";
  if (winnerSide === "A") return ownOnA ? "own" : "opponent";
  return ownOnA ? "opponent" : "own";
}

function getTournamentStatus(matches: TournamentPlayerMatch[]): string {
  if (matches.length === 0) return "Sin partidos publicados (cuadros pendientes)";
  if (matches.every((match) => match.result === "Pendiente")) return "Partidos programados";
  return "Partidos disponibles con resultados";
}

function parseTournamentPlayerMatches(
  playerHtml: string,
  playerName: string,
  tournamentId: string,
  pageUrl: string,
): TournamentPlayerMatch[] {
  const $ = cheerio.load(playerHtml);
  const rows = $("table.matches.player tr, table.matches tr").toArray();
  const targetTokens = getNameTokens(playerName);
  const matches: TournamentPlayerMatch[] = [];

  for (const row of rows) {
    const tds = $(row).find("td");
    if (!tds.length) continue;

    const cellsText = tds
      .toArray()
      .map((c) => cleanText($(c).text()))
      .filter((text) => text.length > 0);

    const scheduleCell = $(row).find("td.plannedtime").first();
    const scheduleText = cleanText(scheduleCell.text()) || findFirstDateCellText(cellsText);
    if (!/\d{2}\/\d{2}\/\d{4}/.test(scheduleText)) continue;

    const drawAnchor = $(row).find('a[href*="draw.aspx?id="]').first();
    const drawName = cleanText(drawAnchor.text()) || "Sin sorteo";
    const explicitCategory = cellsText.find((value) => /^(IM|IF|DM|DF|DX)$/i.test(value));
    const category = explicitCategory || drawName.split("-")[0]?.trim() || "General";

    const dashIndex = tds
      .toArray()
      .findIndex((cell) => cleanText($(cell).text()) === "-");

    let sideA: string[] = [];
    let sideB: string[] = [];

    if (dashIndex >= 0) {
      sideA = extractPlayersNearDash($, tds, dashIndex, true);
      sideB = extractPlayersNearDash($, tds, dashIndex, false);
    }

    const nowrapCells = $(row).find("td.nowrap");
    if ((sideA.length === 0 || sideB.length === 0) && nowrapCells.length >= 2) {
      sideA = sideA.length > 0 ? sideA : extractPlayersFromSideCell($, nowrapCells.eq(0));
      sideB = sideB.length > 0 ? sideB : extractPlayersFromSideCell($, nowrapCells.eq(1));
    }

    if (sideA.length === 0 || sideB.length === 0) {
      sideA = dashIndex >= 1 ? extractSideNames($, row, [dashIndex - 2, dashIndex - 1, dashIndex - 1]) : sideA;
      sideB = dashIndex >= 0 ? extractSideNames($, row, [dashIndex + 1, dashIndex + 2, dashIndex + 1]) : sideB;
    }

    if (sideA.length === 0 && sideB.length === 0) {
      const allPlayers = $(row)
        .find("a[href*='player.aspx?id=']")
        .toArray()
        .map((a) => cleanText($(a).text()))
        .filter((name) => Boolean(name) && !/export calendar/i.test(name));
      const half = Math.ceil(allPlayers.length / 2);
      sideA = allPlayers.slice(0, half);
      sideB = allPlayers.slice(half);
    }

    if (sideA.length === 0 || sideB.length === 0) {
      const allPlayers = $(row)
        .find("a[href*='player.aspx?id=']")
        .toArray()
        .map((a) => cleanText($(a).text()))
        .filter((name) => Boolean(name) && !/export calendar/i.test(name));

      if (allPlayers.length >= 2) {
        const half = Math.ceil(allPlayers.length / 2);
        if (sideA.length === 0) sideA = allPlayers.slice(0, half);
        if (sideB.length === 0) sideB = allPlayers.slice(half);
      }
    }

    const ownOnA = hasTargetPlayer(sideA, targetTokens);
    const ownOnB = hasTargetPlayer(sideB, targetTokens);
    const ownIsA = ownOnA || !ownOnB;
    const ownSide = ownIsA ? sideA : sideB;
    const opponentSide = ownIsA ? sideB : sideA;
    const isDoublesCategory = /^(DM|DF|DX)$/i.test(category);
    const playerCount: 1 | 2 = isDoublesCategory || ownSide.length > 1 ? 2 : 1;

    const rowText = cleanText($(row).text());

    const scoreFromSpan = cleanText($(row).find("span.score").text());
    const rawResult = scoreFromSpan || parseResultText(rowText, cellsText);
    const result = orientResultToOwnSide(rawResult, ownIsA);
    const winner = getWinnerFromResult(rawResult, ownIsA);

    matches.push({
      category,
      drawName,
      schedule: scheduleText,
      result,
      playerCount,
      ownSide,
      opponentSide,
      winner,
      drawUrl: drawAnchor.length
        ? resolveUrlFrom(pageUrl, drawAnchor.attr("href") ?? "")
        : `${BADMINTON_BASE_URL}/sport/draws.aspx?id=${tournamentId}`,
    });
  }

  return matches;
}

type RecentTournamentContext = {
  tournamentId: string;
  tournamentName: string;
  tournamentUrl: string;
  playerUrl: string | null;
};

function parseRecentTournamentContexts(
  $: cheerio.CheerioAPI,
  playerName: string,
): RecentTournamentContext[] {
  const rows = $("table.ruler.matches tr").toArray();
  const targetTokens = getNameTokens(playerName);

  const contexts: RecentTournamentContext[] = [];
  let currentContext: RecentTournamentContext | null = null;

  for (const row of rows) {
    const heading = $(row).find('th a[href*="/sport/tournament.aspx?id="]').first();
    if (heading.length > 0) {
      const url = toAbsoluteUrl(heading.attr("href") ?? "");
      const id = extractQueryParam(url, "id");

      if (id) {
        currentContext = {
          tournamentId: id,
          tournamentName: cleanText(heading.text()),
          tournamentUrl: url,
          playerUrl: null,
        };
        contexts.push(currentContext);
      }
      continue;
    }

    if (!currentContext) continue;

    if (!currentContext.playerUrl) {
      const context = currentContext;
      $(row)
        .find("a[href*='/sport/player.aspx?id='], a[href*='sport/player.aspx?id=']")
        .each((_, link) => {
          if (context?.playerUrl) return;
          const text = cleanText($(link).text());
          if (scoreNameMatch(text, targetTokens) > 0) {
            context.playerUrl = toAbsoluteUrl($(link).attr("href") ?? "");
          }
        });
    }
  }

  return contexts;
}

async function buildUpcomingTournament(
  summary: { id: string; name: string; location: string; tournamentUrl: string },
  playerName: string,
): Promise<UpcomingTournament> {
  const tournamentHtml = await fetchHtml(summary.tournamentUrl);
  const lastUpdated = parseLastUpdatedFromTournamentPage(tournamentHtml);

  const playersUrl = `${BADMINTON_BASE_URL}/sport/players.aspx?id=${summary.id}`;
  const playersHtml = await fetchHtml(playersUrl);
  const playersRoot = cheerio.load(playersHtml);
  const playerTournamentUrl = pickBestPlayerUrl(playersRoot, playerName);

  let matches: TournamentPlayerMatch[] = [];
  let status = "Jugador no encontrado en el torneo";

  if (playerTournamentUrl) {
    const tournamentPlayerHtml = await fetchHtml(playerTournamentUrl);
    matches = parseTournamentPlayerMatches(tournamentPlayerHtml, playerName, summary.id, playerTournamentUrl);
    status = getTournamentStatus(matches);
  }

  return {
    id: summary.id,
    name: summary.name,
    location: summary.location,
    tournamentUrl: summary.tournamentUrl,
    drawUrl: `${BADMINTON_BASE_URL}/sport/draws.aspx?id=${summary.id}`,
    matchesUrl: `${BADMINTON_BASE_URL}/sport/matches.aspx?id=${summary.id}`,
    playerTournamentUrl,
    status,
    lastUpdated,
    matches,
  };
}

type RecentTournamentWithMatches = {
  tournamentId: string;
  tournamentName: string;
  tournamentUrl: string;
  playerUrl: string;
  matches: TournamentPlayerMatch[];
};

async function parseRecentTournamentsWithMatches(
  $: cheerio.CheerioAPI,
  playerName: string,
): Promise<RecentTournamentWithMatches[]> {
  const contexts = parseRecentTournamentContexts($, playerName).filter((context) => Boolean(context.playerUrl));
  const uniqueContexts = new Map<string, RecentTournamentContext>();

  for (const context of contexts) {
    if (!context.playerUrl) continue;
    if (!uniqueContexts.has(context.tournamentId)) {
      uniqueContexts.set(context.tournamentId, context);
    }
  }

  const result: RecentTournamentWithMatches[] = [];
  for (const context of [...uniqueContexts.values()].slice(0, 10)) {
    if (!context.playerUrl) continue;

    try {
      const tournamentPlayerHtml = await fetchHtml(context.playerUrl);
      const matches = parseTournamentPlayerMatches(
        tournamentPlayerHtml,
        playerName,
        context.tournamentId,
        context.playerUrl,
      );

      result.push({
        tournamentId: context.tournamentId,
        tournamentName: context.tournamentName,
        tournamentUrl: context.tournamentUrl,
        playerUrl: context.playerUrl,
        matches,
      });
    } catch {
      // Ignore one failing tournament and continue with others.
    }
  }

  return result;
}

function toPlayedTournament(
  recent: RecentTournamentWithMatches,
  location: string,
  lastUpdated: string | null,
): PlayedTournament {
  return {
    id: recent.tournamentId,
    name: recent.tournamentName,
    location,
    tournamentUrl: recent.tournamentUrl,
    drawUrl: `${BADMINTON_BASE_URL}/sport/draws.aspx?id=${recent.tournamentId}`,
    matchesUrl: `${BADMINTON_BASE_URL}/sport/matches.aspx?id=${recent.tournamentId}`,
    playerTournamentUrl: recent.playerUrl,
    status: getTournamentStatus(recent.matches),
    lastUpdated,
    matches: recent.matches,
  };
}

function parseLatestMatchesByCategoryFromRecent(
  recentTournaments: RecentTournamentWithMatches[],
): CategoryMatch[] {
  if (recentTournaments.length === 0) return [];

  const grouped = new Map<string, { match: CategoryMatch; timestamp: number }>();

  for (const context of recentTournaments.slice(0, 6)) {
    for (const match of context.matches) {
      const timestamp = parseScheduleToTimestamp(match.schedule);
      const existing = grouped.get(match.category);

      if (!existing || timestamp > existing.timestamp) {
        grouped.set(match.category, {
          timestamp,
          match: {
            category: match.category,
            schedule: match.schedule,
            result: match.result,
            playerCount: match.playerCount,
            ownSide: match.ownSide,
            opponentSide: match.opponentSide,
            winner: match.winner,
            tournamentName: context.tournamentName,
            tournamentUrl: context.tournamentUrl,
            drawUrl: match.drawUrl,
            playerTournamentUrl: context.playerUrl,
          },
        });
      }
    }
  }

  return [...grouped.values()]
    .sort((a, b) => b.timestamp - a.timestamp)
    .map((entry) => entry.match);
}

export async function getPlayerDashboard(queryRaw: string): Promise<PlayerDashboard> {
  const query = queryRaw.trim();

  if (!query) {
    throw new Error("Debes indicar un ID nacional o un ID de perfil.");
  }

  const resolvedProfileId = await resolveProfileId(query);

  if (!resolvedProfileId) {
    return {
      query,
      resolvedProfileId: null,
      playerName: null,
      profileOverviewUrl: null,
      profileMatchesUrl: null,
      upcomingTournament: null,
      upcomingTournaments: [],
      previousTournaments: [],
      latestCategoryMatches: [],
      profileStats: null,
      rankingEntries: [],
      note: "No se pudo resolver este ID en los rankings actuales. Puedes probar con tu ID de perfil (GUID) o definir BAD_PLAYER_MAP en .env.local.",
    };
  }

  const overviewUrl = `${BADMINTON_BASE_URL}/profile/overview.aspx?id=${resolvedProfileId}`;
  const overviewHtml = await fetchHtml(overviewUrl);
  const $ = cheerio.load(overviewHtml);

  const profileHeader = $("div.profileheader");
  if (!profileHeader.length) {
    throw new Error("No se ha podido cargar el perfil del jugador.");
  }

  const playerName =
    cleanText(profileHeader.find("h3").first().text()) ||
    cleanText($("title").text().replace("Federación Española de Bádminton -", ""));
  const { profileStats } = parseProfileStatsAndRanking($);
  let rankingEntries: RankingEntry[] = [];

  let liveRankingUrl = extractLiveRankingUrl($);
  if (!liveRankingUrl) {
    try {
      liveRankingUrl = await resolveLiveRankingUrlFromCategoryPages(query, playerName);
    } catch (categoryError) {
      if (categoryError instanceof Error && /^\d+$/.test(categoryError.message)) {
        liveRankingUrl = `${BADMINTON_BASE_URL}/ranking/player.aspx?rid=440&player=${categoryError.message}`;
      } else {
        liveRankingUrl = null;
      }
    }
  }

  if (!liveRankingUrl) {
    try {
      liveRankingUrl = await resolveLiveRankingUrlFromSearch(query, playerName);
    } catch {
      liveRankingUrl = null;
    }
  }

  if (liveRankingUrl) {
    try {
      const liveRankingHtml = await fetchHtml(liveRankingUrl);
      rankingEntries = parseRankingEntriesFromLiveRankingPage(liveRankingHtml);
    } catch {
      rankingEntries = [];
    }
  }

  const upcomingSummaries = parseUpcomingTournamentSummaries($);
  const upcomingTournaments: UpcomingTournament[] = [];

  for (const summary of upcomingSummaries) {
    try {
      upcomingTournaments.push(await buildUpcomingTournament(summary, playerName));
    } catch {
      upcomingTournaments.push({
        id: summary.id,
        name: summary.name,
        location: summary.location,
        tournamentUrl: summary.tournamentUrl,
        drawUrl: `${BADMINTON_BASE_URL}/sport/draws.aspx?id=${summary.id}`,
        matchesUrl: `${BADMINTON_BASE_URL}/sport/matches.aspx?id=${summary.id}`,
        playerTournamentUrl: null,
        status: "No se pudo analizar el torneo",
        lastUpdated: null,
        matches: [],
      });
    }
  }

  const recentTournaments = await parseRecentTournamentsWithMatches($, playerName);
  const upcomingIds = new Set(upcomingTournaments.map((t) => t.id));

  const previousTournaments = recentTournaments
    .filter((tournament) => !upcomingIds.has(tournament.tournamentId))
    .map((tournament) => toPlayedTournament(tournament, "", null));

  const latestCategoryMatches = parseLatestMatchesByCategoryFromRecent(recentTournaments);

  return {
    query,
    resolvedProfileId,
    playerName,
    profileOverviewUrl: overviewUrl,
    profileMatchesUrl: `${BADMINTON_BASE_URL}/profile/matches.aspx?id=${resolvedProfileId}`,
    upcomingTournament: upcomingTournaments[0] ?? null,
    upcomingTournaments,
    previousTournaments,
    latestCategoryMatches,
    profileStats,
    rankingEntries,
    note: null,
  };
}

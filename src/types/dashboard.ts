export type TournamentMatch = {
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

export type Tournament = {
  id: string;
  name: string;
  location: string;
  tournamentUrl: string;
  drawUrl: string;
  matchesUrl: string;
  playerTournamentUrl: string | null;
  status: string;
  lastUpdated: string | null;
  matches: TournamentMatch[];
};

export type CategoryMatch = {
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

export type ProfileStats = {
  disciplines: Array<{
    discipline: string;
    totalPlayed: number;
    totalWon: number;
    totalLost: number;
    currentPlayed: number;
    currentWon: number;
    currentLost: number;
  }>;
  seasonCurrent: { played: number; won: number; lost: number };
  seasonPrevious: { played: number; won: number; lost: number };
};

export type RankingEntry = {
  category: string;
  rank: string;
  rankingPoints: string;
  totalPoints: string;
};

export type DashboardResponse = {
  query: string;
  resolvedProfileId: string | null;
  playerName: string | null;
  profileOverviewUrl: string | null;
  profileMatchesUrl: string | null;
  upcomingTournament: Tournament | null;
  upcomingTournaments: Tournament[];
  previousTournaments: Tournament[];
  latestCategoryMatches: CategoryMatch[];
  profileStats: ProfileStats | null;
  rankingEntries: RankingEntry[];
  note: string | null;
};

export type DrawResponse = {
  tournamentId: string;
  drawId: string;
  drawType: "elimination" | "group" | "unknown";
  drawTypeLabel: string;
  groupStandings: {
    title: string;
    headers: string[];
    rows: string[][];
  } | null;
  rounds: Array<{
    name: string;
    matches: Array<{
      participants: Array<{
        name: string;
        won: boolean;
        highlight: boolean;
      }>;
      score: string;
      highlightIn: boolean;
      highlightOut: boolean;
    }>;
  }>;
};

export type Language = "es" | "en";
export type ThemeMode = "dark-ocean" | "dark-forest" | "light";
export type ActiveView = "home" | "profile" | "previous";

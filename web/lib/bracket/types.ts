export type BracketTheme = {
  bg: string;
  card_fill: string;
  card_stroke: string;
  text: string;
  muted: string;
  accent: string;
  winner: string;
  font_family: string;
};

export type AirtableRecord<TFields extends Record<string, unknown> = Record<string, unknown>> = {
  id: string;
  fields: TFields;
};

export type TeamLink = { name: string };

export type MatchFields = {
  "Match Key"?: string;
  "Team A"?: TeamLink[] | string | string[];
  "Team B"?: TeamLink[] | string | string[];
  "Scheduled Time"?: string;
  "Game #"?: number | string;
  Winner?: { name: string } | string;
  Tournament?: string | string[];
};

export type TournamentFields = {
  "Tournament Name"?: string;
  Name?: string;
  Title?: string;
  Status?: string;
  Season?: string;
  Sport?: string;
};

export type TournamentSummary = {
  id: string;
  name: string;
  status: string | null;
  sport: string | null;
  matchCount: number;
};

export type BracketMatch = AirtableRecord<MatchFields>;

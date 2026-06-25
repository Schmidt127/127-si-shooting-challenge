export type AnchorSide = "left" | "right" | "top" | "bottom";

export type BracketConnector = {
  from: string;
  fromSide: AnchorSide;
  to: string;
  toSide: AnchorSide;
  dashed?: boolean;
  /** Vertical stem, horizontal at corridorY, vertical into target (2 bends). */
  corridorDrop?: { corridorY: number };
};

export type BracketLayoutDefinition = {
  id: string;
  label: string;
  width: number;
  height: number;
  padding: number;
  cardW: number;
  cardH: number;
  cardRadius: number;
  boxPad: number;
  /** When set, game # / name / time render outside the team box (not inside). */
  externalMeta?: "above" | "below";
  metaH?: number;
  metaTitlePx?: number;
  metaTimePx?: number;
  metaLineH?: number;
  layout: Record<string, [number, number]>;
  order: string[];
  connectors: BracketConnector[];
  winnersLabel?: { text: string; x: number; y: number };
  losersLabel?: { text: string; x: number; y: number };
};

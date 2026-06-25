import type { BracketLayoutDefinition } from "../layout-definition";

/**
 * Montana HS basketball — landscape sheet.
 * Winners → RIGHT. Losers → LEFT.
 * Layout `y` = top of team matchup box; labels render directly above.
 */
export const MONTANA_MATCH_KEYS = [
  "Quarterfinal 1",
  "Quarterfinal 2",
  "Quarterfinal 3",
  "Quarterfinal 4",
  "Loser Out 1",
  "Loser Out 2",
  "Semi Final 1",
  "Semi Final 2",
  "Loser Out 3",
  "Loser Out 4",
  "Consolation",
  "Championship",
] as const;

const INCH = 96;
const WIDTH = 1920;
const HEIGHT = 720;
const CARD_W = 172;
const CARD_H = 56;
/** Two stacked label lines (game + time) directly above each team box */
const META_H = 26;

const CONS_X = INCH;
const QF_X = 860;
const SF_X = 1180;
const CHAMP_X = WIDTH - INCH - CARD_W;

// QF vertical spacing: small gap g, large gap between QF2–QF3 (+1" vs prior)
const BRACKET_TOP = 108 + META_H;
const g = 34;
const big = g * 4 + INCH;

const qf1y = BRACKET_TOP;
const qf2y = qf1y + CARD_H + g;
const qf3y = qf2y + CARD_H + big;
const qf4y = qf3y + CARD_H + g;

const midTop = (qf1y + qf2y + CARD_H) / 2;
const midBot = (qf3y + qf4y + CARD_H) / 2;
const midAll = (qf1y + qf4y + CARD_H) / 2;
const pairY = (y: number) => Math.round(y - CARD_H / 2);

/** LO3/LO4 sit closer to center than LO1/LO2 so feeder lines angle inward */
const LO12_X = 500;
const LO34_X = LO12_X - 108;
const LO3_MID_Y = midTop - 20;
const LO4_MID_Y = midBot + 20;

/** SF loser corridors stop short of each other so dashed runs don't overlap */
const SF1_CORRIDOR_Y = midAll - 30;
const SF2_CORRIDOR_Y = midAll + 30;

const POSITIONS: Record<string, [number, number]> = {
  "Quarterfinal 1": [QF_X, qf1y],
  "Quarterfinal 2": [QF_X, qf2y],
  "Quarterfinal 3": [QF_X, qf3y],
  "Quarterfinal 4": [QF_X, qf4y],
  "Loser Out 1": [LO12_X, pairY(midTop)],
  "Loser Out 2": [LO12_X, pairY(midBot)],
  "Semi Final 1": [SF_X, pairY(midTop)],
  "Semi Final 2": [SF_X, pairY(midBot)],
  "Loser Out 3": [LO34_X, pairY(LO3_MID_Y)],
  "Loser Out 4": [LO34_X, pairY(LO4_MID_Y)],
  Consolation: [CONS_X, pairY(midAll)],
  Championship: [CHAMP_X, pairY(midAll)],
};

export const basketballMontanaLayout: BracketLayoutDefinition = {
  id: "basketball-montana",
  label: "Montana basketball (landscape: losers ← | → winners)",
  width: WIDTH,
  height: HEIGHT,
  padding: 48,
  cardW: CARD_W,
  cardH: CARD_H,
  cardRadius: 4,
  boxPad: 0,
  externalMeta: "above",
  metaH: META_H,
  metaTitlePx: 9,
  metaTimePx: 8,
  metaLineH: 10,
  layout: POSITIONS,
  order: [...MONTANA_MATCH_KEYS],
  connectors: [
    { from: "Quarterfinal 1", fromSide: "right", to: "Semi Final 1", toSide: "left" },
    { from: "Quarterfinal 2", fromSide: "right", to: "Semi Final 1", toSide: "left" },
    { from: "Quarterfinal 3", fromSide: "right", to: "Semi Final 2", toSide: "left" },
    { from: "Quarterfinal 4", fromSide: "right", to: "Semi Final 2", toSide: "left" },
    { from: "Semi Final 1", fromSide: "right", to: "Championship", toSide: "left" },
    { from: "Semi Final 2", fromSide: "right", to: "Championship", toSide: "left" },
    { from: "Quarterfinal 1", fromSide: "left", to: "Loser Out 1", toSide: "right", dashed: true },
    { from: "Quarterfinal 2", fromSide: "left", to: "Loser Out 1", toSide: "right", dashed: true },
    { from: "Quarterfinal 3", fromSide: "left", to: "Loser Out 2", toSide: "right", dashed: true },
    { from: "Quarterfinal 4", fromSide: "left", to: "Loser Out 2", toSide: "right", dashed: true },
    {
      from: "Semi Final 1",
      fromSide: "left",
      to: "Loser Out 4",
      toSide: "right",
      dashed: true,
      corridorDrop: { corridorY: SF1_CORRIDOR_Y },
    },
    {
      from: "Semi Final 2",
      fromSide: "left",
      to: "Loser Out 3",
      toSide: "right",
      dashed: true,
      corridorDrop: { corridorY: SF2_CORRIDOR_Y },
    },
    { from: "Loser Out 1", fromSide: "left", to: "Loser Out 3", toSide: "right" },
    { from: "Loser Out 2", fromSide: "left", to: "Loser Out 4", toSide: "right" },
    { from: "Loser Out 3", fromSide: "left", to: "Consolation", toSide: "right" },
    { from: "Loser Out 4", fromSide: "left", to: "Consolation", toSide: "right" },
  ],
  losersLabel: { text: "← Losers / Consolation", x: CONS_X, y: 88 },
  winnersLabel: { text: "Winners →", x: QF_X, y: 88 },
};

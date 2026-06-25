import type { BracketLayoutDefinition } from "../layout-definition";

export const WIDTH = 1800;
export const HEIGHT = 1000;
export const PADDING = 80;
export const CARD_W = 220;
export const CARD_H = 80;
export const RADIUS = 8;
export const Y_STEP = 120;
export const W_Y_START = 140;
export const L_Y_START = W_Y_START + 4 * Y_STEP + 80;

const POSITIONS: Record<string, [number, number]> = {
  QF1: [PADDING, W_Y_START + 0 * Y_STEP],
  QF2: [PADDING, W_Y_START + 1 * Y_STEP],
  QF3: [PADDING, W_Y_START + 2 * Y_STEP],
  QF4: [PADDING, W_Y_START + 3 * Y_STEP],
  SF1: [PADDING + 280, W_Y_START + 0.5 * Y_STEP],
  SF2: [PADDING + 280, W_Y_START + 2.5 * Y_STEP],
  WF: [PADDING + 560, W_Y_START + 1.5 * Y_STEP],
  FINAL: [PADDING + 840, W_Y_START + 1.5 * Y_STEP],
  "FINAL - IF NEEDED": [PADDING + 1080, W_Y_START + 1.9 * Y_STEP],
  L1: [PADDING, L_Y_START + 0.0 * Y_STEP],
  L2: [PADDING, L_Y_START + 1.0 * Y_STEP],
  L3: [PADDING + 280, L_Y_START + 0.0 * Y_STEP],
  L4: [PADDING + 280, L_Y_START + 1.0 * Y_STEP],
  L5: [PADDING + 560, L_Y_START + 0.5 * Y_STEP],
  L6: [PADDING + 840, L_Y_START + 0.5 * Y_STEP],
};

const ORDER = [
  "QF1", "QF2", "QF3", "QF4", "SF1", "SF2", "WF", "FINAL", "FINAL - IF NEEDED",
  "L1", "L2", "L3", "L4", "L5", "L6",
];

export const volleyballLayout: BracketLayoutDefinition = {
  id: "volleyball",
  label: "Volleyball (stacked double elimination)",
  width: WIDTH,
  height: HEIGHT,
  padding: PADDING,
  cardW: CARD_W,
  cardH: CARD_H,
  cardRadius: RADIUS,
  boxPad: 0,
  layout: POSITIONS,
  order: ORDER,
  connectors: [
    { from: "QF1", fromSide: "right", to: "SF1", toSide: "left" },
    { from: "QF4", fromSide: "right", to: "SF1", toSide: "left" },
    { from: "QF2", fromSide: "right", to: "SF2", toSide: "left" },
    { from: "QF3", fromSide: "right", to: "SF2", toSide: "left" },
    { from: "SF1", fromSide: "right", to: "WF", toSide: "left" },
    { from: "SF2", fromSide: "right", to: "WF", toSide: "left" },
    { from: "WF", fromSide: "right", to: "FINAL", toSide: "left" },
    { from: "L1", fromSide: "right", to: "L3", toSide: "left" },
    { from: "L2", fromSide: "right", to: "L4", toSide: "left" },
    { from: "L5", fromSide: "right", to: "L6", toSide: "left" },
    { from: "WF", fromSide: "left", to: "L6", toSide: "left", dashed: true },
  ],
  winnersLabel: { text: "Winners Bracket", x: PADDING, y: 100 },
  losersLabel: { text: "Losers Bracket", x: PADDING, y: POSITIONS.L1[1] - 14 },
};

export const LAYOUT = POSITIONS;
export { ORDER };
export const CONNECTORS: Array<[string, string, boolean]> = volleyballLayout.connectors.map(
  (c) => [c.from, c.to, c.dashed ?? false],
);
export const STRAIGHT_CONNECTORS = new Set(["L1|L3", "L2|L4"]);

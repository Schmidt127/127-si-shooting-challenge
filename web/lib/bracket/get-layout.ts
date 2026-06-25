import type { BracketLayoutDefinition } from "./layout-definition";
import { basketballMontanaLayout } from "./layouts/basketball-montana";
import { volleyballLayout } from "./layouts/volleyball";

export function getLayoutForFixture(layout?: string): BracketLayoutDefinition {
  if (layout === "basketball-montana") return basketballMontanaLayout;
  return volleyballLayout;
}

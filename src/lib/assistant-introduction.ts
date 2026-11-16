// The existing entrance finishes before the portrait panel unfolds.
export const introductionDelayMs = 1700;
/** UI-only handling for one page visit; conversation credentials are independent. */
export function createIntroductionVisit() {
  let handled = false;
  return {
    isConsumed: () => handled,
    consume() { if (handled) return false; handled = true; return true; },
  };
}

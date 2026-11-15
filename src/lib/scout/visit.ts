/** Display consent only. The HttpOnly cookie remains the sole ownership credential. */
export const scoutVisitKey = 'aa.scout.conversation-visible.v1';

export function createScoutVisit(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null,
  navigation: { type: string; referrer: string; origin: string }) {
  let visible = false;
  try {
    const internalNavigation = navigation.type === 'navigate' && !!navigation.referrer &&
      new URL(navigation.referrer).origin === navigation.origin;
    visible = (navigation.type === 'reload' || internalNavigation) && storage?.getItem(scoutVisitKey) === '1';
  } catch { /* Missing UI storage never grants transcript visibility. */ }
  function set(value: boolean) {
    visible = value;
    try { if (value) storage?.setItem(scoutVisitKey, '1'); else storage?.removeItem(scoutVisitKey); } catch { /* In-memory choice still works. */ }
  }
  set(visible);
  return { isVisible: () => visible, accept: () => set(true), forget: () => set(false) };
}

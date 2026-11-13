export const introductionSessionKey = 'aa.scout.introduction.v1';
// The existing 650ms entrance completes before a natural pause of about one second.
export const introductionDelayMs = 1700;

type TabStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Fail closed when tab storage is unavailable: manual Scout remains usable. */
export function createIntroductionSession(storage: TabStorage | null) {
  let consumed = false;
  return {
    isConsumed() {
      if (consumed || !storage) return true;
      try { return storage.getItem(introductionSessionKey) !== null; }
      catch { return true; }
    },
    consume() {
      consumed = true;
      if (!storage) return false;
      try { storage.setItem(introductionSessionKey, '1'); return true; }
      catch { return false; }
    },
  };
}

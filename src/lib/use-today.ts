// Ported unchanged from the desktop app (renderer/lib/use-today.ts).
import * as React from "react";

import { todayKey } from "./time";

/** Re-evaluates after midnight and whenever the window regains focus (covers sleep/wake). */
function subscribe(onChange: () => void): () => void {
  let timer: number | undefined;

  const arm = () => {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    timer = window.setTimeout(() => {
      onChange();
      arm();
    }, nextMidnight.getTime() - now.getTime());
  };
  arm();

  const refresh = () => {
    window.clearTimeout(timer);
    onChange();
    arm();
  };
  const onVisibility = () => {
    if (document.visibilityState === "visible") refresh();
  };
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    window.clearTimeout(timer);
    window.removeEventListener("focus", refresh);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

/** Today's local date (yyyy-MM-dd) that stays current while the page is open. */
export function useTodayKey(): string {
  return React.useSyncExternalStore(subscribe, todayKey);
}

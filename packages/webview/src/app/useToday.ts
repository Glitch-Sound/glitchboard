import { useEffect, useState } from "react";
import { todayInTokyo } from "../../../shared/src/calculation/dates.js";

/** 日付境界に合わせて再描画し、スリープ復帰時も現在日を確認する。 */
export function useToday(): string {
  const [today, setToday] = useState(todayInTokyo);
  useEffect(() => {
    const refresh = () => setToday(todayInTokyo());
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return today;
}

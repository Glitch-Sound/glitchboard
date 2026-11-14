import type { Project } from "../domain/index.js";
import {
  addCalendarDays,
  isWorkday,
  type WorkdaySettings,
  workdaysBetween,
} from "./dates.js";
import { pendingWork } from "./prediction.js";

/** REQ-009: 全未完了Eventの残りptを期限までの稼働日に均等配分する。 */
export function calculateRequiredPace(
  projects: readonly Project[],
  today: string,
  displayEnd: string,
  settings: WorkdaySettings,
): Record<string, number> {
  const daily: Record<string, number> = {};
  for (let day = today; day <= displayEnd; day = addCalendarDays(day, 1))
    daily[day] = 0;
  for (const item of pendingWork(projects)) {
    if (item.remaining <= 0) continue;
    const available = workdaysBetween(today, item.due, settings);
    if (item.due < today || available.length === 0) {
      let next = today;
      while (next <= displayEnd && !isWorkday(next, settings))
        next = addCalendarDays(next, 1);
      if (next <= displayEnd) daily[next] = (daily[next] ?? 0) + item.remaining;
      continue;
    }
    const perDay = item.remaining / available.length;
    for (const day of available) {
      if (day <= displayEnd) daily[day] = (daily[day] ?? 0) + perDay;
    }
  }
  return daily;
}

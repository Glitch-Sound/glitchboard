import { addCalendarDays } from "../../../../../shared/src/calculation/dates.js";

export type Period = "three-days" | "week" | "month";

/** REQ-015: 3日、1週間、月の表示日付列を作る。 */
export function displayDays(period: Period, today: string): string[] {
  if (period !== "month") {
    const count = period === "three-days" ? 3 : 7;
    return Array.from({ length: count }, (_, index) =>
      addCalendarDays(today, index),
    );
  }
  const first = `${today.slice(0, 7)}-01`;
  const days: string[] = [];
  for (
    let day = first;
    day.slice(0, 7) === today.slice(0, 7);
    day = addCalendarDays(day, 1)
  )
    days.push(day);
  return days;
}

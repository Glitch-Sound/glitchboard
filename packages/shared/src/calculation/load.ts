import { type WorkdaySettings, workdaysBetween } from "./dates.js";

/** REQ-010: 表示期間の必要ptを稼働可能ptで割った百分率を返す。 */
export function calculatePeriodLoad(
  requiredByDay: Readonly<Record<string, number>>,
  start: string,
  end: string,
  settings: WorkdaySettings,
  pace: number | null,
): number | null {
  const workdayCount = workdaysBetween(start, end, settings).length;
  if (pace === null || pace <= 0 || workdayCount === 0) return null;
  const required = Object.entries(requiredByDay).reduce(
    (sum, [date, points]) => sum + (date >= start && date <= end ? points : 0),
    0,
  );
  return (required / (workdayCount * pace)) * 100;
}

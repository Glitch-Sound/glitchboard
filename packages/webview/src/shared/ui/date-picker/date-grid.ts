import {
  addCalendarDays,
  dateKey,
  utcDate,
} from "../../../../../shared/src/calculation/dates.js";

/** REQ-022-S08: ローカル時刻へ変換せず、UTCの暦日で月と週を作る。 */
export function moveMonth(month: string, amount: number): string {
  const date = utcDate(`${month}-01`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return dateKey(date).slice(0, 7);
}
export function monthDays(month: string): string[] {
  const first = `${month}-01`;
  const start = addCalendarDays(first, -utcDate(first).getUTCDay());
  return Array.from({ length: 42 }, (_, index) =>
    addCalendarDays(start, index),
  );
}

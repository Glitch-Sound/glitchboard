import * as holidayJp from "@holiday-jp/holiday_jp";

export type WorkdaySettings = {
  workdays_off: readonly string[];
  public_holidays: boolean;
};

const weekdayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export function utcDate(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

export function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addCalendarDays(day: string, amount: number): string {
  const date = utcDate(day);
  date.setUTCDate(date.getUTCDate() + amount);
  return dateKey(date);
}

export function calendarDayDifference(from: string, to: string): number {
  return Math.round(
    (utcDate(to).getTime() - utcDate(from).getTime()) / 86_400_000,
  );
}

/** REQ-006: Asia/Tokyoの暦日を求める。 */
export function todayInTokyo(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** REQ-006: 設定された曜日と日本の祝日を除く。 */
export function isWorkday(day: string, settings: WorkdaySettings): boolean {
  const weekday = weekdayNames[utcDate(day).getUTCDay()];
  return (
    !settings.workdays_off.includes(weekday) &&
    (!settings.public_holidays || !holidayJp.isHoliday(day))
  );
}

export function workdaysBetween(
  start: string,
  end: string,
  settings: WorkdaySettings,
): string[] {
  if (start > end) return [];
  const days: string[] = [];
  for (let day = start; day <= end; day = addCalendarDays(day, 1)) {
    if (isWorkday(day, settings)) days.push(day);
  }
  return days;
}

export function previousWorkdays(
  today: string,
  count: number,
  settings: WorkdaySettings,
): string[] {
  const days: string[] = [];
  for (let day = today; days.length < count; day = addCalendarDays(day, -1)) {
    if (isWorkday(day, settings)) days.push(day);
  }
  return days.reverse();
}

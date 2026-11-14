import type { Project } from "../domain/index.js";
import {
  addCalendarDays,
  calendarDayDifference,
  type WorkdaySettings,
} from "./dates.js";
import { pendingWork, predictCompletionDates } from "./prediction.js";
import { calculateRequiredPace } from "./required.js";

export type EventDanger = {
  approaching: boolean;
  overdue: boolean;
  overflow: boolean;
  caution: boolean;
};

/** REQ-011: Eventの期限危険と表示期間内の負荷重なりを集計する。 */
export function calculateDanger(
  projects: readonly Project[],
  today: string,
  displayStart: string,
  displayEnd: string,
  settings: WorkdaySettings,
  pace: number | null,
  learning: boolean,
): {
  events: Record<string, EventDanger>;
  eventDangerCount: number;
  overlapDays: string[];
  count: number;
} {
  const predictions = learning
    ? {}
    : predictCompletionDates(projects, today, settings, pace);
  const events: Record<string, EventDanger> = {};
  let eventDangerCount = 0;
  for (const item of pendingWork(projects)) {
    const daysUntilDue = calendarDayDifference(today, item.due);
    const prediction = predictions[item.eventId];
    const danger = {
      approaching: daysUntilDue >= 0 && daysUntilDue <= 3,
      overdue: daysUntilDue < 0,
      overflow:
        !learning &&
        prediction !== null &&
        prediction !== undefined &&
        prediction > item.due,
      caution: daysUntilDue >= 4 && daysUntilDue <= 7,
    };
    events[item.eventId] = danger;
    if (danger.approaching || danger.overdue || danger.overflow)
      eventDangerCount++;
  }

  const overlapDays: string[] = [];
  if (!learning && pace !== null && Number.isFinite(pace)) {
    const required = calculateRequiredPace(
      projects,
      today,
      displayEnd,
      settings,
    );
    for (
      let day = displayStart;
      day <= displayEnd;
      day = addCalendarDays(day, 1)
    ) {
      if ((required[day] ?? 0) > pace) overlapDays.push(day);
    }
  }
  return {
    events,
    eventDangerCount,
    overlapDays,
    count: eventDangerCount + Number(overlapDays.length > 0),
  };
}

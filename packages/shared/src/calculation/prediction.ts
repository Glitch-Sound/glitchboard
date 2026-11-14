import { eventPoints, type Project } from "../domain/index.js";
import { addCalendarDays, isWorkday, type WorkdaySettings } from "./dates.js";

type WorkItem = {
  projectId: string;
  eventId: string;
  due: string;
  remaining: number;
};

/** REQ-008: 期限、Project ID、Event IDで安定して順序を決める。 */
export function pendingWork(projects: readonly Project[]): WorkItem[] {
  const work: WorkItem[] = [];
  for (const project of projects) {
    for (const event of project.events) {
      const points = eventPoints(event);
      const remaining = points.total - points.done;
      if (
        remaining > 0 ||
        event.stories.flatMap((story) => story.tasks).length === 0
      )
        work.push({
          projectId: project.id,
          eventId: event.id,
          due: event.due,
          remaining,
        });
    }
  }
  return work.sort(
    (a, b) =>
      a.due.localeCompare(b.due) ||
      a.projectId.localeCompare(b.projectId) ||
      a.eventId.localeCompare(b.eventId),
  );
}

/** REQ-008: 実績ペースを期限順のEventへ配分して完了日を返す。 */
export function predictCompletionDates(
  projects: readonly Project[],
  today: string,
  settings: WorkdaySettings,
  pace: number | null,
): Record<string, string | null> {
  const work = pendingWork(projects).filter((item) => item.remaining > 0);
  const result: Record<string, string | null> = Object.fromEntries(
    work.map((item) => [item.eventId, null]),
  );
  if (pace === null || pace <= 0 || settings.workdays_off.length === 7)
    return result;
  let index = 0;
  let day = today;
  // 100年を超える予測は日付として有用でないため算出不能として残す。
  for (
    let elapsed = 0;
    index < work.length && elapsed < 36_525;
    elapsed++, day = addCalendarDays(day, 1)
  ) {
    if (!isWorkday(day, settings)) continue;
    let available = pace;
    while (available > 0 && index < work.length) {
      const item = work[index];
      if (!item) break;
      const consumed = Math.min(available, item.remaining);
      item.remaining -= consumed;
      available -= consumed;
      if (item.remaining <= 1e-9) {
        result[item.eventId] = day;
        index++;
      }
    }
  }
  return result;
}

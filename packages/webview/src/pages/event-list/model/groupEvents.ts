import {
  addCalendarDays,
  utcDate,
} from "../../../../../shared/src/calculation/dates.js";
import type { Event, Project } from "../../../../../shared/src/domain/index.js";

export type EventRow = { project: Project; event: Event };
export type EventGroups = {
  overdue: EventRow[];
  week: EventRow[];
  future: EventRow[];
  completed: EventRow[];
};
export type TargetFilter = "pending" | "all";

function isCompleted(event: Event): boolean {
  const tasks = event.stories.flatMap((story) => story.tasks);
  return tasks.length > 0 && tasks.every((task) => Boolean(task.doneAt));
}

/** REQ-019: 未完了Eventを期限切れ・今週・今後へ分け、完了済みを別扱いにする。 */
export function groupEvents(
  projects: readonly Project[],
  today: string,
  target: TargetFilter,
): EventGroups {
  const groups: EventGroups = {
    overdue: [],
    week: [],
    future: [],
    completed: [],
  };
  const sunday = addCalendarDays(today, (7 - utcDate(today).getUTCDay()) % 7);
  for (const project of projects)
    for (const event of project.events) {
      const row = { project, event };
      if (isCompleted(event)) {
        if (target === "all") groups.completed.push(row);
      } else if (event.due < today) groups.overdue.push(row);
      else if (event.due <= sunday) groups.week.push(row);
      else groups.future.push(row);
    }
  for (const rows of Object.values(groups))
    rows.sort(
      (a, b) =>
        a.event.due.localeCompare(b.event.due) ||
        a.project.id.localeCompare(b.project.id) ||
        a.event.id.localeCompare(b.event.id),
    );
  return groups;
}

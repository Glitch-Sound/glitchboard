import {
  effectiveTaskPoints,
  type Project,
  type Task,
} from "../domain/index.js";
import {
  previousWorkdays,
  type WorkdaySettings,
  workdaysBetween,
} from "./dates.js";

export type ActualPace = {
  learning: boolean;
  pace: number | null;
  total: number;
  daily: { date: string; points: number }[];
};

function allTasks(projects: readonly Project[]): Task[] {
  return projects.flatMap((project) =>
    project.events.flatMap((event) =>
      event.stories.flatMap((story) => story.tasks),
    ),
  );
}

/** REQ-007: 読込中Projectの直近10稼働日を固定分母で集計する。 */
export function calculateActualPace(
  projects: readonly Project[],
  today: string,
  settings: WorkdaySettings,
): ActualPace {
  const completed = allTasks(projects).filter(
    (task) => task.doneAt && task.doneAt <= today,
  );
  const first = completed.map((task) => task.doneAt as string).sort()[0];
  const observedDays = first
    ? workdaysBetween(first, today, settings).length
    : 0;
  const learning = observedDays < 10;
  const dates = previousWorkdays(today, 10, settings);
  const daily = dates.map((date) => ({
    date,
    points: completed.reduce(
      (sum, task) =>
        sum + (task.doneAt === date ? effectiveTaskPoints(task) : 0),
      0,
    ),
  }));
  const total = daily.reduce((sum, day) => sum + day.points, 0);
  return { learning, pace: learning ? null : total / 10, total, daily };
}

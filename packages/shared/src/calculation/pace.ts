import {
  effectiveTaskPoints,
  type Project,
  type Task,
} from "../domain/index.js";
import {
  addCalendarDays,
  isWorkday,
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
  if (settings.workdays_off.length === 7)
    return { learning: true, pace: null, total: 0, daily: [] };
  const completed = allTasks(projects).filter(
    (task) => task.doneAt && task.doneAt <= today,
  );
  const creditedDate = (date: string): string => {
    let day = date;
    while (!isWorkday(day, settings)) day = addCalendarDays(day, 1);
    return day;
  };
  const credits = completed.map((task) => ({
    date: creditedDate(task.doneAt as string),
    points: effectiveTaskPoints(task),
  }));
  const first = credits.map((item) => item.date).sort()[0];
  // 休日の今日に完了した分も、次の稼働日の棒とペースへ即時反映する。
  const latest = creditedDate(today);
  const observedDays = first
    ? workdaysBetween(first, latest, settings).length
    : 0;
  const learning = observedDays < 10;
  const dates = previousWorkdays(latest, 10, settings);
  const daily = dates.map((date) => ({
    date,
    points: credits.reduce(
      (sum, item) => sum + (item.date === date ? item.points : 0),
      0,
    ),
  }));
  const total = daily.reduce((sum, day) => sum + day.points, 0);
  return { learning, pace: learning ? null : total / 10, total, daily };
}

import { describe, expect, it } from "vitest";
import { calculatePeriodLoad } from "../../packages/shared/src/calculation/load.js";
import { calculateActualPace } from "../../packages/shared/src/calculation/pace.js";
import {
  pendingWork,
  predictCompletionDates,
} from "../../packages/shared/src/calculation/prediction.js";
import { calculateRequiredPace } from "../../packages/shared/src/calculation/required.js";
import {
  eventPoints,
  type Project,
  storyPoints,
} from "../../packages/shared/src/domain/index.js";

const settings = { workdays_off: [], public_holidays: false };
const today = "2026-11-14";
function fixture(): Project[] {
  return [
    {
      id: "project",
      name: "Project",
      color: "#123456",
      events: [
        {
          id: "event",
          name: "Event",
          due: "2026-11-16",
          tasks: [
            {
              id: "calibration",
              name: "学習開始",
              points: 2,
              doneAt: "2026-11-01",
            },
            {
              id: "delivered",
              name: "完了",
              points: 5,
              doneAt: "2026-11-12",
            },
            { id: "pending", name: "未完了", points: 8 },
            { id: "unestimated", name: "未見積" },
          ],
          stories: [
            {
              id: "normal",
              name: "既存Story",
              tasks: [
                { id: "old-pending", name: "既存未完了", points: 2 },
                {
                  id: "old-done",
                  name: "既存完了",
                  points: 3,
                  doneAt: "2026-11-13",
                },
              ],
            },
          ],
        },
      ],
    },
  ];
}

describe("Eventの直接Taskと既存の計算の接続", () => {
  it("REQ-033-S01 直接TaskとStoryを合わせ、進捗、未見積、残作業と実績ペースを計上する", () => {
    const projects = fixture();
    const event = projects[0].events[0];
    expect(storyPoints(event.stories[0])).toEqual({ done: 3, total: 5 });
    expect(eventPoints(event)).toEqual({ done: 10, total: 23 });
    expect(pendingWork(projects)).toEqual([
      {
        projectId: "project",
        eventId: "event",
        due: "2026-11-16",
        remaining: 13,
      },
    ]);
    const actual = calculateActualPace(projects, today, settings);
    expect(actual).toMatchObject({ learning: false, total: 8, pace: 0.8 });
    expect(actual.daily.filter((day) => day.points > 0)).toEqual([
      { date: "2026-11-12", points: 5 },
      { date: "2026-11-13", points: 3 },
    ]);
    const required = calculateRequiredPace(
      projects,
      today,
      "2026-11-16",
      settings,
    );
    expect(required).toEqual({
      "2026-11-14": 13 / 3,
      "2026-11-15": 13 / 3,
      "2026-11-16": 13 / 3,
    });
    expect(
      calculatePeriodLoad(required, today, "2026-11-16", settings, actual.pace),
    ).toBeCloseTo(541.6666666667);
    expect(
      predictCompletionDates(projects, today, settings, actual.pace),
    ).toEqual({ event: "2026-11-30" });
  });

  it("REQ-024-S01 REQ-024-S02 直接Taskの完了と解除で残作業、負荷、ペースと予測が変わる", () => {
    const projects = fixture();
    const event = projects[0].events[0];
    const task = event.tasks?.[2];
    if (!task) throw new Error("直接Taskがない");
    task.doneAt = today;
    expect(eventPoints(event)).toEqual({ done: 18, total: 23 });
    expect(pendingWork(projects)).toEqual([
      {
        projectId: "project",
        eventId: "event",
        due: "2026-11-16",
        remaining: 5,
      },
    ]);
    const actual = calculateActualPace(projects, today, settings);
    expect(actual).toMatchObject({ learning: false, total: 16, pace: 1.6 });
    const required = calculateRequiredPace(
      projects,
      today,
      "2026-11-16",
      settings,
    );
    expect(required).toEqual({
      "2026-11-14": 5 / 3,
      "2026-11-15": 5 / 3,
      "2026-11-16": 5 / 3,
    });
    expect(
      calculatePeriodLoad(required, today, "2026-11-16", settings, actual.pace),
    ).toBeCloseTo(104.1666666667);
    expect(
      predictCompletionDates(projects, today, settings, actual.pace),
    ).toEqual({ event: "2026-11-17" });
    delete task.doneAt;
    expect(eventPoints(event)).toEqual({ done: 10, total: 23 });
    expect(calculateActualPace(projects, today, settings)).toMatchObject({
      total: 8,
      pace: 0.8,
    });
  });
});

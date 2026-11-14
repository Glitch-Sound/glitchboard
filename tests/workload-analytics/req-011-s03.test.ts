import { describe, expect, it } from "vitest";
import { calculateDanger } from "../../packages/shared/src/calculation/danger.js";
import { projectWithTasks, weekdays } from "./fixtures.js";

describe("REQ-011-S03 学習中", () => {
  it("期限切れのみを判定して溢れと重なりを抑止する", () => {
    const project = projectWithTasks([{ points: 5 }], "2026-11-08");
    const result = calculateDanger(
      [project],
      "2026-11-09",
      "2026-11-09",
      "2026-11-11",
      weekdays,
      null,
      true,
    );
    expect(result.events["project-event"]).toMatchObject({
      overdue: true,
      overflow: false,
    });
    expect(result.overlapDays).toEqual([]);
    expect(result.count).toBe(1);
  });
});

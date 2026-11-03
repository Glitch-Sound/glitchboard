import { describe, expect, it } from "vitest";
import { calculateDanger } from "../../packages/shared/src/calculation/danger.js";
import { calculatePeriodLoad } from "../../packages/shared/src/calculation/load.js";
import { projectWithTasks, weekdays } from "./fixtures.js";

describe("期限と期間負荷の回帰", () => {
  it("REQ-010-S03: 月初の過去の稼働日を期間負荷の分母に含めない", () => {
    const required = { "2026-11-16": 4, "2026-11-17": 4 };
    expect(
      calculatePeriodLoad(required, "2026-11-01", "2026-11-17", weekdays, 2),
    ).toBe(200);
  });

  it("REQ-011-S04: TaskがないEventも期限接近・期限切れに含める", () => {
    const project = projectWithTasks([], "2026-11-11");
    const approaching = calculateDanger(
      [project],
      "2026-11-09",
      "2026-11-09",
      "2026-11-11",
      weekdays,
      null,
      true,
    );
    const overdue = calculateDanger(
      [project],
      "2026-11-12",
      "2026-11-12",
      "2026-11-12",
      weekdays,
      null,
      true,
    );
    expect(approaching.events["project-event"]?.approaching).toBe(true);
    expect(overdue.events["project-event"]?.overdue).toBe(true);
    expect(overdue.eventDangerCount).toBe(1);
  });
});

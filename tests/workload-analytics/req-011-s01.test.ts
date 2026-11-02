import { describe, expect, it } from "vitest";
import { calculateDanger } from "../../packages/shared/src/calculation/danger.js";
import { projectWithTasks, weekdays } from "./fixtures.js";

describe("REQ-011-S01 期限接近と溢れ", () => {
  it("同一Eventの複数危険をEvent1件として数える", () => {
    const project = projectWithTasks([{ points: 8 }], "2026-11-11");
    const result = calculateDanger(
      [project],
      "2026-11-09",
      "2026-11-09",
      "2026-11-11",
      weekdays,
      1,
      false,
    );
    expect(result.events["project-event"]).toMatchObject({
      approaching: true,
      overflow: true,
    });
    expect(result.eventDangerCount).toBe(1);
  });
});

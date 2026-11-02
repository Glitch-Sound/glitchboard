import { describe, expect, it } from "vitest";
import { calculateActualPace } from "../../packages/shared/src/calculation/pace.js";
import { projectWithTasks, weekdays } from "./fixtures.js";

describe("REQ-007-S01 未見積の完了", () => {
  it("直近10稼働日の6ptを10で割る", () => {
    const project = projectWithTasks([
      { points: 3, doneAt: "2026-11-09" },
      { doneAt: "2026-11-20" },
    ]);
    const result = calculateActualPace([project], "2026-11-20", weekdays);
    expect(result.learning).toBe(false);
    expect(result.pace).toBe(0.6);
    expect(result.total).toBe(6);
  });
});

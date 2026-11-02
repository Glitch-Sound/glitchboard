import { describe, expect, it } from "vitest";
import { calculateActualPace } from "../../packages/shared/src/calculation/pace.js";
import { projectWithTasks, weekdays } from "./fixtures.js";

describe("REQ-007-S03 0ptの実績", () => {
  it("学習後の直近10稼働日に完了がなければ0pt/日とする", () => {
    const project = projectWithTasks([{ points: 3, doneAt: "2026-10-01" }]);
    const result = calculateActualPace([project], "2026-11-20", weekdays);
    expect(result.learning).toBe(false);
    expect(result.pace).toBe(0);
  });
});

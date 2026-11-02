import { describe, expect, it } from "vitest";
import { calculateActualPace } from "../../packages/shared/src/calculation/pace.js";
import { projectWithTasks, weekdays } from "./fixtures.js";

describe("REQ-007-S02 学習中の境界", () => {
  it("初回完了から9稼働日目は学習中でペースを公開しない", () => {
    const project = projectWithTasks([{ points: 3, doneAt: "2026-11-09" }]);
    const result = calculateActualPace([project], "2026-11-19", weekdays);
    expect(result.learning).toBe(true);
    expect(result.pace).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { calculateRequiredPace } from "../../packages/shared/src/calculation/required.js";
import { projectWithTasks, weekdays } from "./fixtures.js";

describe("REQ-009-S02 期限切れ", () => {
  it("休日の今日に期限切れ残量をまとめて載せる", () => {
    const project = projectWithTasks([{ points: 5 }], "2026-11-21");
    const result = calculateRequiredPace(
      [project],
      "2026-11-22",
      "2026-11-24",
      weekdays,
    );
    expect(result["2026-11-22"]).toBe(5);
    expect(result["2026-11-23"]).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import { calculateActualPace } from "../../packages/shared/src/calculation/pace.js";
import { projectWithTasks } from "./fixtures.js";

describe("REQ-007-S04 祝日の完了", () => {
  it("祝日の今日に完了したポイントを次の稼働日へ載せ、当日からペースに含める", () => {
    const settings = { workdays_off: ["sat", "sun"], public_holidays: true };
    const project = projectWithTasks([
      { points: 3, doneAt: "2026-10-20" },
      { points: 5, doneAt: "2026-11-03" },
    ]);
    const result = calculateActualPace([project], "2026-11-03", settings);
    expect(result.learning).toBe(false);
    expect(result.daily.at(-1)).toEqual({ date: "2026-11-04", points: 5 });
    expect(result.pace).toBe(0.5);
  });
});

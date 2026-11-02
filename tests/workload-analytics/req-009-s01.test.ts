import { describe, expect, it } from "vitest";
import { calculateRequiredPace } from "../../packages/shared/src/calculation/required.js";
import { projectWithTasks, weekdays } from "./fixtures.js";

describe("REQ-009-S01 期限が休日", () => {
  it("期限前の2稼働日に均等配分して休日を0にする", () => {
    const project = projectWithTasks(
      [{ points: 2 }, { points: 2 }],
      "2026-11-21",
    );
    const result = calculateRequiredPace(
      [project],
      "2026-11-19",
      "2026-11-21",
      weekdays,
    );
    expect(result).toMatchObject({
      "2026-11-19": 2,
      "2026-11-20": 2,
      "2026-11-21": 0,
    });
  });
});

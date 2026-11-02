import { describe, expect, it } from "vitest";
import { calculatePeriodLoad } from "../../packages/shared/src/calculation/load.js";
import { weekdays } from "./fixtures.js";

describe("REQ-010-S01 100%超", () => {
  it("必要12pt、4稼働日、実績2pt/日を150%にする", () => {
    const required = {
      "2026-11-16": 3,
      "2026-11-17": 3,
      "2026-11-18": 3,
      "2026-11-19": 3,
    };
    expect(
      calculatePeriodLoad(required, "2026-11-16", "2026-11-19", weekdays, 2),
    ).toBe(150);
  });
});

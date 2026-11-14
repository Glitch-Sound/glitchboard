import { describe, expect, it } from "vitest";
import { calculatePeriodLoad } from "../../packages/shared/src/calculation/load.js";
import { weekdays } from "./fixtures.js";

describe("REQ-010-S02 分母0", () => {
  it("学習中または稼働日0なら百分率を返さない", () => {
    const required = { "2026-11-21": 5 };
    expect(
      calculatePeriodLoad(required, "2026-11-21", "2026-11-22", weekdays, 2),
    ).toBeNull();
    expect(
      calculatePeriodLoad(required, "2026-11-21", "2026-11-22", weekdays, null),
    ).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { isWorkday } from "../../packages/shared/src/calculation/dates.js";

describe("REQ-006-S02 祝日を稼働日とする", () => {
  it("祝日設定を無効にすると火曜日を稼働日にする", () => {
    expect(
      isWorkday("2026-11-03", {
        workdays_off: ["sat", "sun"],
        public_holidays: false,
      }),
    ).toBe(true);
  });
});

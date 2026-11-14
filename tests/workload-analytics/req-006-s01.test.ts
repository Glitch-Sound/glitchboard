import { describe, expect, it } from "vitest";
import { isWorkday } from "../../packages/shared/src/calculation/dates.js";

describe("REQ-006-S01 休日設定", () => {
  it("2026-11-03を日本の祝日として除く", () => {
    expect(
      isWorkday("2026-11-03", {
        workdays_off: ["sat", "sun"],
        public_holidays: true,
      }),
    ).toBe(false);
  });
});

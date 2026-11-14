import { describe, expect, it } from "vitest";
import { displayDays } from "../../packages/webview/src/pages/board/model/period.js";

describe("REQ-015-S01 月末", () => {
  it("2026年11月は1日から30日までの列を返す", () => {
    const days = displayDays("month", "2026-11-03");
    expect(days).toHaveLength(30);
    expect(days[0]).toBe("2026-11-01");
    expect(days.at(-1)).toBe("2026-11-30");
  });
});

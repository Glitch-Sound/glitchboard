import { describe, expect, it } from "vitest";
import { predictCompletionDates } from "../../packages/shared/src/calculation/prediction.js";
import { projectWithTasks, weekdays } from "./fixtures.js";

describe("REQ-008-S01 複数Projectの競合", () => {
  it("期限の早いEventから実績ペースを割り当てる", () => {
    const earlier = projectWithTasks([{ points: 2 }], "2026-11-10", "alpha");
    const later = projectWithTasks([{ points: 2 }], "2026-11-20", "beta");
    const result = predictCompletionDates(
      [later, earlier],
      "2026-11-09",
      weekdays,
      2,
    );
    expect(result["alpha-event"]).toBe("2026-11-09");
    expect(result["beta-event"]).toBe("2026-11-10");
  });
});

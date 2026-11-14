import { describe, expect, it } from "vitest";
import { calculateDanger } from "../../packages/shared/src/calculation/danger.js";
import { projectWithTasks, weekdays } from "./fixtures.js";

describe("REQ-011-S02 注意のみ", () => {
  it("期限まで5暦日は黄色の注意だが危険件数には入れない", () => {
    const project = projectWithTasks([{ points: 1 }], "2026-11-14");
    const result = calculateDanger(
      [project],
      "2026-11-09",
      "2026-11-09",
      "2026-11-14",
      weekdays,
      10,
      false,
    );
    expect(result.events["project-event"]).toMatchObject({
      caution: true,
      approaching: false,
    });
    expect(result.count).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import { predictCompletionDates } from "../../packages/shared/src/calculation/prediction.js";
import { projectWithTasks, weekdays } from "./fixtures.js";

describe("REQ-008-S02 算出不能", () => {
  it("学習中または0pt/日なら完了予測を返さない", () => {
    const project = projectWithTasks([{ points: 3 }]);
    expect(
      predictCompletionDates([project], "2026-11-09", weekdays, null)[
        "project-event"
      ],
    ).toBeNull();
    expect(
      predictCompletionDates([project], "2026-11-09", weekdays, 0)[
        "project-event"
      ],
    ).toBeNull();
  });
});

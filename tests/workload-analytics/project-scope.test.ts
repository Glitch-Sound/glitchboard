import { describe, expect, it } from "vitest";
import { calculateDanger } from "../../packages/shared/src/calculation/danger.js";
import { predictCompletionDates } from "../../packages/shared/src/calculation/prediction.js";
import {
  itemReference,
  scopeProjects,
} from "../../packages/shared/src/domain/identity.js";

const settings = { workdays_off: [], public_holidays: false };
describe("REQ-005-S06 Project参照付きの計算", () => {
  it("同じEvent IDでも予測と危険を別の結果として保持する", () => {
    const projects = scopeProjects(
      [3, 8].map((points, i) => ({
        id: "same-project",
        sourceFile: `${i === 0 ? "A" : "B"}.yaml`,
        name: "Project",
        color: "#123456",
        events: [
          {
            id: "same-event",
            name: "Event",
            due: "2026-11-16",
            tasks: [{ id: "same-task", name: "Task", points: points as 3 | 8 }],
            stories: [],
          },
        ],
      })),
    );
    const predictions = predictCompletionDates(
      projects,
      "2026-11-14",
      settings,
      2,
    );
    expect(
      Object.entries(predictions).map(([key, prediction]) => ({
        ...itemReference(key),
        prediction,
      })),
    ).toEqual([
      { id: "same-event", projectFile: "A.yaml", prediction: "2026-11-15" },
      { id: "same-event", projectFile: "B.yaml", prediction: "2026-11-19" },
    ]);
    const danger = calculateDanger(
      projects,
      "2026-11-14",
      "2026-11-14",
      "2026-11-16",
      settings,
      2,
      false,
    );
    expect(
      Object.entries(danger.events).map(([key, value]) => ({
        ...itemReference(key),
        overflow: value.overflow,
      })),
    ).toEqual([
      { id: "same-event", projectFile: "A.yaml", overflow: false },
      { id: "same-event", projectFile: "B.yaml", overflow: true },
    ]);
  });
});

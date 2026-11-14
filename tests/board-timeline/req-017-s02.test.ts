// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { Timeline } from "../../packages/webview/src/widgets/timeline/ui/Timeline.js";
import { WorkloadHeader } from "../../packages/webview/src/widgets/workload/ui/WorkloadHeader.js";

describe("REQ-017-S02 負荷の超過", () => {
  it("2ptを超える部分を赤く示して日付列も強調する", () => {
    render(
      createElement(WorkloadHeader, {
        completedByDay: {},
        pace: 2,
        learning: false,
        periodLoad: 150,
        dangerCount: 1,
      }),
    );
    const { container } = render(
      createElement(Timeline, {
        projects: [],
        days: ["2026-11-03"],
        today: "2026-11-03",
        period: "three-days",
        selectedEventId: null,
        onSelect: () => {},
        requiredByDay: { "2026-11-03": 3 },
        pace: 2,
        learning: false,
      }),
    );
    expect(container.querySelector(".overload-area")).toBeTruthy();
    expect(
      container.querySelector(".overlap-day[data-date='2026-11-03']"),
    ).toBeTruthy();
    expect(container.querySelector(".pace-line")).toBeTruthy();
  });
});

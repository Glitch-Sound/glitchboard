// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { Timeline } from "../../packages/webview/src/widgets/timeline/ui/Timeline.js";
import { WorkloadHeader } from "../../packages/webview/src/widgets/workload/ui/WorkloadHeader.js";

describe("REQ-017-S01 学習中の表示", () => {
  it("必要ペースと学習中だけを表示する", () => {
    render(
      createElement(WorkloadHeader, {
        completedByDay: {},
        pace: null,
        learning: true,
        periodLoad: null,
        dangerCount: 0,
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
        pace: null,
        learning: true,
      }),
    );
    expect(screen.getByText("学習中")).toBeTruthy();
    expect(container.querySelector(".required-step")).toBeTruthy();
    expect(container.querySelector(".pace-line")).toBeNull();
    expect(container.querySelector(".overload-area")).toBeNull();
  });
});

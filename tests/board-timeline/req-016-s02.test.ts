// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import type { Project } from "../../packages/shared/src/domain/index.js";
import { Timeline } from "../../packages/webview/src/widgets/timeline/ui/Timeline.js";

describe("REQ-016-S02 月表示", () => {
  it("選択中Eventだけにマーカーのラベルを付ける", () => {
    const events = ["A", "B", "C"].map((name, index) => ({
      id: `event-${index}`,
      name,
      due: `2026-11-${String(10 + index).padStart(2, "0")}`,
      stories: [],
    }));
    const projects = [
      { id: "project", name: "Alpha", color: "#123456", events },
    ] as Project[];
    render(
      createElement(Timeline, {
        projects,
        days: ["2026-11-10", "2026-11-11", "2026-11-12"],
        today: "2026-11-03",
        period: "month",
        selectedEventId: "event-1",
        onSelect: () => {},
      }),
    );
    expect(screen.getByText("B")).toBeTruthy();
    expect(screen.queryByText("A")).toBeNull();
    expect(screen.queryByText("C")).toBeNull();
  });

  it("月初が休日の今日なら専用の列表示にする", () => {
    const { container } = render(
      createElement(Timeline, {
        projects: [
          { id: "project", name: "Alpha", color: "#123456", events: [] },
        ] as Project[],
        days: ["2026-11-01", "2026-11-02"],
        today: "2026-11-01",
        period: "month",
        selectedEventId: null,
        onSelect: () => {},
        settings: { workdays_off: ["sun"], public_holidays: false },
      }),
    );
    expect(
      container.querySelectorAll(
        '.today-holiday:has(time[datetime="2026-11-01"])',
      ),
    ).toHaveLength(1);
    expect(container.querySelectorAll("tbody td.today-holiday")).toHaveLength(
      1,
    );
    expect(container.querySelector("tbody td.holiday")).toBeNull();
  });
});

// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Project } from "../../packages/shared/src/domain/index.js";
import { Timeline } from "../../packages/webview/src/widgets/timeline/ui/Timeline.js";

describe("REQ-016-S01 同日の複数Event", () => {
  it("3件の一覧からEventを選択する", () => {
    const events = ["A", "B", "C"].map((name, index) => ({
      id: `event-${index}`,
      name,
      due: "2026-11-10",
      stories: [],
    }));
    const projects = [
      { id: "project", name: "Alpha", color: "#123456", events },
    ] as Project[];
    const onSelect = vi.fn();
    render(
      createElement(Timeline, {
        projects,
        days: ["2026-11-10"],
        today: "2026-11-03",
        period: "week",
        selectedEventId: null,
        onSelect,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /3件/ }));
    expect(screen.getAllByRole("option")).toHaveLength(3);
    fireEvent.click(screen.getByRole("option", { name: "B" }));
    expect(onSelect).toHaveBeenCalledWith("event-1");
  });
});

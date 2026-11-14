// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Project } from "../../packages/shared/src/domain/index.js";
import { EventList } from "../../packages/webview/src/pages/event-list/ui/EventList.js";
import { Timeline } from "../../packages/webview/src/widgets/timeline/ui/Timeline.js";

describe("REQ-016-S04 期限切れのEvent", () => {
  it("期限切れがなければ日付列がProjectの直後から始まる", () => {
    render(
      createElement(Timeline, {
        projects: [
          { id: "project", name: "Alpha", color: "#123456", events: [] },
        ] as Project[],
        days: ["2026-11-03"],
        today: "2026-11-03",
        period: "week",
        selectedEventId: null,
        onSelect: () => {},
      }),
    );
    expect(screen.queryByRole("columnheader", { name: "期限切れ" })).toBeNull();
    expect(
      (
        screen.getByRole("columnheader", {
          name: /11\/03/,
        }) as HTMLTableCellElement
      ).cellIndex,
    ).toBe(1);
  });

  it("タイムラインから期限切れを除き、EVENT一覧から選択できる", () => {
    const projects = [
      {
        id: "project",
        name: "Alpha",
        color: "#123456",
        events: [
          { id: "first", name: "A", due: "2026-11-01", stories: [] },
          { id: "second", name: "B", due: "2026-11-02", stories: [] },
        ],
      },
    ] as Project[];
    const onSelect = vi.fn();
    render(
      createElement(Timeline, {
        projects,
        days: ["2026-11-03"],
        today: "2026-11-03",
        period: "week",
        selectedEventId: null,
        onSelect,
      }),
    );
    expect(screen.queryByRole("columnheader", { name: "期限切れ" })).toBeNull();
    expect(screen.queryByRole("button", { name: "2件のEvent" })).toBeNull();
    render(
      createElement(EventList, {
        projects,
        today: "2026-11-03",
        target: "pending",
        onSelect,
      }),
    );
    fireEvent.click(
      screen.getByText("B").closest("button") as HTMLButtonElement,
    );
    expect(onSelect).toHaveBeenCalledWith("second");
  });
});

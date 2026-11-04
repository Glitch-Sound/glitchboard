// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import type { Project } from "../../packages/shared/src/domain/index.js";
import { EventFilters } from "../../packages/webview/src/pages/event-list/ui/EventFilters.js";
import { EventList } from "../../packages/webview/src/pages/event-list/ui/EventList.js";

describe("REQ-020-S01 期限切れの包含", () => {
  it("初期の未完了 + 今後で期限切れを表示し条件と件数を示す", () => {
    const projects = [
      {
        id: "project",
        name: "Alpha",
        color: "#123456",
        events: [
          { id: "overdue", name: "Overdue", due: "2026-11-02", stories: [] },
        ],
      },
    ] as Project[];
    render(
      createElement(
        "div",
        null,
        createElement(EventFilters, {
          target: "pending",
          projects,
          onTargetChange: () => {},
        }),
        createElement(EventList, {
          projects,
          today: "2026-11-03",
          target: "pending",
        }),
      ),
    );
    expect(screen.getByText("期限切れ・未完了")).toBeTruthy();
    expect(screen.getByText(/未完了 \+ 今後/)).toBeTruthy();
    expect(screen.getByText(/1件/)).toBeTruthy();
    expect(
      screen.getByText("1", { selector: ".event-group h2 > span" }),
    ).toBeTruthy();
  });
});

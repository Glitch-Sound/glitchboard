// @vitest-environment jsdom
import { render, within } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import type { Project } from "../../packages/shared/src/domain/index.js";
import { Timeline } from "../../packages/webview/src/widgets/timeline/ui/Timeline.js";

describe("REQ-016-S03 短期表示のEvent名", () => {
  it.each(["three-days", "week"] as const)(
    "%sでは未選択のEvent名も表示する",
    (period) => {
      const projects = [
        {
          id: "project",
          name: "Alpha",
          color: "#123456",
          events: [
            { id: "a", name: "A", due: "2026-11-10", stories: [] },
            { id: "b", name: "B", due: "2026-11-11", stories: [] },
          ],
        },
      ] as Project[];
      const { container } = render(
        createElement(Timeline, {
          projects,
          days: ["2026-11-10", "2026-11-11"],
          today: "2026-11-09",
          period,
          selectedEventId: "a",
          onSelect: () => {},
        }),
      );
      expect(within(container).getByText("A")).toBeTruthy();
      expect(within(container).getByText("B")).toBeTruthy();
    },
  );
});

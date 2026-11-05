// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Project } from "../../packages/shared/src/domain/index.js";
import { Timeline } from "../../packages/webview/src/widgets/timeline/ui/Timeline.js";

describe("PROJECT追加行", () => {
  it("PROJECT列内で入力し、追加後に閉じる", async () => {
    const onAddProject = vi.fn(async () => true);
    const { container } = render(
      createElement(Timeline, {
        projects: [
          {
            id: "project",
            name: "Atlas",
            color: "#47b8c3",
            events: [
              { id: "event", name: "期限切れ", due: "2026-11-01", stories: [] },
            ],
          },
        ] as Project[],
        days: ["2026-11-06", "2026-11-07"],
        today: "2026-11-06",
        period: "week",
        selectedEventId: null,
        onSelect: () => {},
        onAddProject,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Projectを追加" }));
    const row = container.querySelector<HTMLTableRowElement>(
      ".timeline-project-add-row",
    );
    expect(row?.cells).toHaveLength(4);
    expect(row?.cells[0]?.colSpan).toBe(1);
    const name = screen.getByRole("textbox", { name: "名前" });
    expect(name.closest("td")).toBe(row?.cells[0]);
    expect(name).toHaveProperty("placeholder", "プロジェクト名 — Enterで追加");
    fireEvent.change(name, { target: { value: "Beacon" } });
    fireEvent.change(screen.getByLabelText("色"), {
      target: { value: "#a979df" },
    });
    const form = name.closest("form");
    if (!form) throw new Error("Project追加フォームが見つからない");
    fireEvent.submit(form);
    await waitFor(() =>
      expect(onAddProject).toHaveBeenCalledWith("Beacon", "#a979df"),
    );
    await waitFor(() =>
      expect(container.querySelector(".timeline-project-add-row")).toBeNull(),
    );
  });
});

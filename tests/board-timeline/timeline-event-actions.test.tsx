// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Timeline } from "../../packages/webview/src/widgets/timeline/ui/Timeline.js";

afterEach(cleanup);
it.each(["three-days", "week", "month"] as const)(
  "REQ-016-S06 %s の日付セルと同日一覧には詳細ボタンを置かず選択だけを行う",
  (period) => {
    const onSelect = vi.fn(),
      onDetail = vi.fn(),
      onProject = vi.fn();
    const project = {
      id: "project",
      name: "Alpha",
      color: "#123456",
      events: [
        { id: "single", name: "Single", due: "2026-11-19", stories: [] },
        { id: "pair-a", name: "Pair A", due: "2026-11-20", stories: [] },
        { id: "pair-b", name: "Pair B", due: "2026-11-20", stories: [] },
      ],
    };
    const view = render(
      <Timeline
        projects={[project]}
        days={["2026-11-19", "2026-11-20"]}
        today="2026-11-18"
        period={period}
        selectedEventId={null}
        onSelect={onSelect}
        onOpenDetail={onDetail}
        onSelectProject={onProject}
      />,
    );
    expect(view.container.querySelectorAll("td .detail-button")).toHaveLength(
      0,
    );
    fireEvent.click(screen.getByRole("button", { name: "Single" }));
    expect(onSelect.mock.calls).toEqual([["single"]]);
    expect(onDetail).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "2件のEvent" }));
    expect(screen.getAllByRole("option").map((n) => n.textContent)).toEqual([
      "Pair A",
      "Pair B",
    ]);
    expect(
      screen.getByRole("listbox").querySelectorAll(".detail-button"),
    ).toHaveLength(0);
    fireEvent.click(screen.getByRole("option", { name: "Pair B" }));
    expect(onSelect.mock.calls).toEqual([["single"], ["pair-b"]]);
    expect(onDetail).not.toHaveBeenCalled();
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Alphaの詳細" }));
    expect(onDetail.mock.calls).toEqual([["project", "project"]]);
    expect(onProject).not.toHaveBeenCalled();
  },
);

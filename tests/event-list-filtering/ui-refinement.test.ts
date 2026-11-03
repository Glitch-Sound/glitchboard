// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Project } from "../../packages/shared/src/domain/index.js";
import { InlineAdd } from "../../packages/webview/src/features/inline-add/ui/InlineAdd.js";
import { EventFilters } from "../../packages/webview/src/pages/event-list/ui/EventFilters.js";

describe("EVENT一覧の入力と抽出", () => {
  it("追加欄の名前案内とProject・期限の選択を示す", () => {
    render(
      createElement(InlineAdd, {
        kind: "event",
        layout: "embedded",
        projectId: "project",
        projects: [{ id: "project", name: "Alpha" }],
        onSubmit: () => true,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Eventを追加" }));
    expect(screen.getByPlaceholderText("Event名")).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Project" })).toBeTruthy();
    expect(screen.getByLabelText("期限")).toBeTruthy();
  });

  it("対象を2つのボタンで切り替え、色付きProjectチップを示す", () => {
    const onTargetChange = vi.fn();
    const projects = [
      { id: "project", name: "Alpha", color: "#123456", events: [] },
    ] as Project[];
    const { container } = render(
      createElement(EventFilters, {
        target: "pending",
        projects,
        projectEntries: [
          { file: "alpha.yaml", load: true, name: "Alpha", color: "#123456" },
        ],
        onTargetChange,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "抽出条件" }));
    fireEvent.click(screen.getByRole("button", { name: "すべて" }));
    expect(onTargetChange).toHaveBeenCalledWith("all");
    expect(screen.getByText("読み込むプロジェクト")).toBeTruthy();
    expect(
      (container.querySelector(".project-chip .project-dot") as HTMLElement)
        .style.backgroundColor,
    ).toBe("rgb(18, 52, 86)");
  });
});

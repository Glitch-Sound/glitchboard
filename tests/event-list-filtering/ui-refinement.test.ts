// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Project } from "../../packages/shared/src/domain/index.js";
import { InlineAdd } from "../../packages/webview/src/features/inline-add/ui/InlineAdd.js";
import { EventFilters } from "../../packages/webview/src/pages/event-list/ui/EventFilters.js";

describe("EVENT一覧の入力と抽出", () => {
  it("添付構成の追加欄から日付を選び、Eventを追加できる", async () => {
    const onSubmit = vi.fn(() => true);
    render(
      createElement(InlineAdd, {
        kind: "event",
        layout: "embedded",
        projectId: "project",
        projects: [{ id: "project", name: "Alpha", color: "#123456" }],
        onSubmit,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Eventを追加" }));
    expect(
      screen.getByPlaceholderText("Event名 — Enterで追加 / Escで取消"),
    ).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Project" })).toBeTruthy();
    const dateInput = screen.getByLabelText("期限") as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: "2026-11-10" } });
    fireEvent.click(screen.getByRole("button", { name: /^期限 / }));
    fireEvent.click(screen.getByRole("button", { name: "2026-11-30" }));
    expect(screen.getByRole("button", { name: "期限 11/30(月)" })).toBeTruthy();
    fireEvent.change(screen.getByRole("textbox", { name: "名前" }), {
      target: { value: "Release" },
    });
    const form = screen.getByRole("textbox", { name: "名前" }).closest("form");
    if (!form) throw new Error("Event追加フォームが見つからない");
    fireEvent.submit(form);
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Release",
        color: undefined,
        due: "2026-11-30",
        projectId: "project",
      }),
    );
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

// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { DeleteDialog } from "../../packages/webview/src/features/delete-item/ui/DeleteControl.js";
import { DetailPanel } from "../../packages/webview/src/widgets/detail-panel/ui/DetailPanel.js";

describe("詳細パネルと削除確認", () => {
  it("REQ-026-S03 Projectタイトル、3枚の指標、共通Taskポイント、独立した操作ボタンを示す", () => {
    const onSave = vi.fn();
    const { container } = render(
      createElement(DetailPanel, {
        selection: {
          kind: "task",
          item: { id: "task", name: "準備", points: 5 },
          hierarchy: ["Project", "Event", "Story", "準備"],
          parentDue: "2026-11-20",
        },
        onClose: () => {},
        onSave,
        onDelete: () => {},
      }),
    );
    expect(screen.getByRole("heading", { name: "Project" })).toBeTruthy();
    expect(screen.getByText("TASK : 準備")).toBeTruthy();
    expect(container.querySelectorAll(".detail-metrics > span")).toHaveLength(
      3,
    );
    fireEvent.click(screen.getByRole("button", { name: "5pt" }));
    fireEvent.change(screen.getByRole("slider", { name: /ポイント/ }), {
      target: { value: "4" },
    });
    expect(onSave).toHaveBeenCalledWith("task", "task", { points: 8 });
    expect(
      container.querySelectorAll(".detail-panel footer button"),
    ).toHaveLength(2);
  });

  it("削除対象、子孫件数、取り消せない案内をカード内へ示す", () => {
    render(
      createElement(DeleteDialog, {
        kind: "story",
        name: "準備",
        counts: { events: 0, stories: 0, tasks: 2 },
        onCancel: () => {},
        onConfirm: () => {},
      }),
    );
    const dialog = screen.getByRole("dialog", { name: "削除確認" });
    expect(dialog.textContent).toContain("「準備」を削除しますか？");
    expect(dialog.textContent).toContain("タスク 2件");
    expect(dialog.textContent).toContain("元に戻せません");
    expect(dialog.querySelector(".delete-warning-icon")).toBeTruthy();
  });
});

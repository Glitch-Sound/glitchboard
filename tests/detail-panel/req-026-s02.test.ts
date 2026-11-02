// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { DetailButton } from "../../packages/webview/src/features/detail-button/index.js";
import { DetailPanel } from "../../packages/webview/src/widgets/detail-panel/index.js";

describe("REQ-026-S02 補足なし", () => {
  it("灰色のTask詳細ボタンから補足追加を示しEscで閉じる", () => {
    const onClose = vi.fn();
    const task = { id: "44444444-4444-4444-8444-444444444444", name: "Write" };
    render(
      createElement(
        "div",
        null,
        createElement(DetailButton, { name: task.name, onOpen: vi.fn() }),
        createElement(DetailPanel, {
          selection: {
            kind: "task",
            item: task,
            hierarchy: ["Alpha", "Launch", "Design", "Write"],
            parentDue: "2026-11-10",
          },
          onClose,
        }),
      ),
    );
    expect(
      screen.getByRole("button", { name: "Writeの詳細" }).className,
    ).toContain("no-note");
    expect(screen.getByText("+ 補足を追加")).toBeDefined();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});

// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { DetailButton } from "../../packages/webview/src/features/detail-button/index.js";
import { DetailPanel } from "../../packages/webview/src/widgets/detail-panel/index.js";

describe("REQ-026-S01 補足あり", () => {
  it("青いStory詳細ボタンから右側の階層と指標を示す", () => {
    const onOpen = vi.fn();
    const story = {
      id: "33333333-3333-4333-8333-333333333333",
      name: "Design",
      note: "確認事項",
      tasks: [],
    };
    render(
      createElement(
        "div",
        null,
        createElement(DetailButton, {
          name: story.name,
          note: story.note,
          onOpen,
        }),
        createElement(DetailPanel, {
          selection: {
            kind: "story",
            item: story,
            hierarchy: ["Alpha", "Launch", "Design"],
          },
          onClose: vi.fn(),
        }),
      ),
    );
    const button = screen.getByRole("button", { name: "Designの詳細" });
    expect(button.className).toContain("has-note");
    fireEvent.click(button);
    expect(onOpen).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("dialog", { name: "詳細パネル" }).textContent,
    ).toContain("Alpha / Launch / Design");
    expect(
      screen.getByRole("dialog", { name: "詳細パネル" }).textContent,
    ).toContain("確認事項");
  });
});

// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { InlineAdd } from "../../packages/webview/src/features/inline-add/ui/InlineAdd.js";

describe("REQ-022-S02 取消", () => {
  it("Story入力中にEscで閉じて追加しない", () => {
    const onSubmit = vi.fn();
    render(createElement(InlineAdd, { kind: "story", onSubmit }));
    fireEvent.click(screen.getByRole("button", { name: "Storyを追加" }));
    fireEvent.change(screen.getByRole("textbox", { name: "名前" }), {
      target: { value: "Draft" },
    });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "名前" }), {
      key: "Escape",
    });
    expect(screen.queryByRole("textbox", { name: "名前" })).toBeNull();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

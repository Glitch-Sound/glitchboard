// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { InlineAdd } from "../../packages/webview/src/features/inline-add/ui/InlineAdd.js";

describe("追加入力の保存結果", () => {
  it("失敗時は入力を残し、成功時に閉じる", async () => {
    let succeed = false;
    render(
      createElement(InlineAdd, {
        kind: "project",
        onSubmit: async () => succeed,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Projectを追加" }));
    fireEvent.change(screen.getByRole("textbox", { name: "名前" }), {
      target: { value: "Alpha" },
    });
    fireEvent.click(screen.getByRole("button", { name: "追加" }));
    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "名前" })).toHaveProperty(
        "value",
        "Alpha",
      );
      expect(screen.getByRole("button", { name: "追加" })).not.toHaveProperty(
        "disabled",
        true,
      );
    });
    succeed = true;
    fireEvent.click(screen.getByRole("button", { name: "追加" }));
    await waitFor(() =>
      expect(screen.queryByRole("textbox", { name: "名前" })).toBeNull(),
    );
  });
});

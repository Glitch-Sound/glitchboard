// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { DetailPanel } from "../../packages/webview/src/widgets/detail-panel/index.js";

describe("REQ-028-S03 補足の保存", () => {
  it("文章と箇条書きを補足として送信し、リンク入力は表示しない", () => {
    const onSave = vi.fn();
    render(
      createElement(DetailPanel, {
        selection: {
          kind: "project",
          item: {
            id: "11111111-1111-4111-8111-111111111111",
            name: "Alpha",
            color: "#123456",
            events: [],
          },
          hierarchy: ["Alpha"],
        },
        onClose: vi.fn(),
        onSave,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "+ 補足を追加" }));
    fireEvent.change(screen.getByLabelText("補足"), {
      target: { value: "説明\n- 項目" },
    });
    expect(screen.queryByText("リンク")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "補足を保存" }));
    expect(onSave).toHaveBeenCalledWith(
      "project",
      "11111111-1111-4111-8111-111111111111",
      { note: "説明\n- 項目" },
    );
  });
});

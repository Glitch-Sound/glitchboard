// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { PointSelector } from "../../packages/webview/src/widgets/event-details/ui/PointSelector.js";

describe("REQ-023-S02 ポイント選択肢を閉じる", () => {
  it("Escと枠外クリックで閉じ、ポイントを変更しない", () => {
    const onChange = vi.fn();
    render(
      createElement(
        "div",
        null,
        createElement(PointSelector, { points: 3, onChange }),
        createElement("button", { type: "button" }, "外側"),
      ),
    );
    const trigger = screen.getByRole("button", { name: "3pt" });
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(trigger);
    fireEvent.pointerDown(screen.getByRole("button", { name: "外側" }));
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(onChange).not.toHaveBeenCalled();
  });
});

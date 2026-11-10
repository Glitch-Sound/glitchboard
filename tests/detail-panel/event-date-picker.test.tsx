// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DetailPanel } from "../../packages/webview/src/widgets/detail-panel/index.js";

afterEach(cleanup);
function setup() {
  const onSave = vi.fn(),
    onClose = vi.fn();
  render(
    <DetailPanel
      selection={{
        kind: "event",
        item: { id: "event", name: "Release", due: "2026-11-10", stories: [] },
        hierarchy: ["Alpha", "Release"],
      }}
      onSave={onSave}
      onClose={onClose}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "編集" }));
  return { onSave, onClose };
}
describe("REQ-027-S01/S03/S04 Event期限編集", () => {
  it.each([
    undefined,
    () => {
      throw new DOMException("blocked", "SecurityError");
    },
  ])("API %oでも既存期限を表示し、保存まで送信しない", (api) => {
    Object.defineProperty(HTMLInputElement.prototype, "showPicker", {
      configurable: true,
      value: api,
    });
    const { onSave } = setup();
    fireEvent.click(screen.getByRole("button", { name: /^期限 / }));
    expect(screen.getByText("2026年11月")).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "2026-11-10" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "2026-11-12" }));
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave).toHaveBeenCalledWith("event", "event", {
      name: "Release",
      due: "2026-11-12",
    });
  });
  it.each(["", "2026-02-30"])("不正期限 %s は保存せず修正できる", (value) => {
    const { onSave } = setup();
    fireEvent.change(screen.getByLabelText("期限"), { target: { value } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("期限"), {
      target: { value: "2028-02-29" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave).toHaveBeenCalledWith("event", "event", {
      name: "Release",
      due: "2028-02-29",
    });
  });
  it("Escと枠外はカレンダーだけを閉じ、編集した名前と期限を保持する", () => {
    const { onSave, onClose } = setup();
    fireEvent.change(screen.getByLabelText("名前"), {
      target: { value: "Changed" },
    });
    fireEvent.change(screen.getByLabelText("期限"), {
      target: { value: "2026-11-12" },
    });
    const trigger = screen.getByRole("button", { name: /^期限 / });
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("button", { name: "2026-11-12" }), {
      key: "Escape",
    });
    expect(document.activeElement).toBe(trigger);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByLabelText("名前"), { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("dialog", { name: "期限のカレンダー" }),
    ).toBeNull();
    fireEvent.click(trigger);
    fireEvent.pointerDown(screen.getByLabelText("名前"));
    expect(
      screen.queryByRole("dialog", { name: "期限のカレンダー" }),
    ).toBeNull();
    expect((screen.getByLabelText("名前") as HTMLInputElement).value).toBe(
      "Changed",
    );
    expect((screen.getByLabelText("期限") as HTMLInputElement).value).toBe(
      "2026-11-12",
    );
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByLabelText("名前"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});

// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InlineAdd } from "../../packages/webview/src/features/inline-add/index.js";

afterEach(cleanup);
function setup(layout: "embedded" | "popover", success = true) {
  const onSubmit = vi.fn(() => success);
  render(
    <InlineAdd
      kind="event"
      layout={layout}
      projects={[
        { id: "p", name: "Alpha" },
        { id: "q", name: "Beta" },
      ]}
      onSubmit={onSubmit}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Eventを追加" }));
  fireEvent.change(screen.getByLabelText("名前"), {
    target: { value: "Release" },
  });
  fireEvent.change(screen.getByLabelText("Project"), {
    target: { value: "q" },
  });
  const form = screen.getByLabelText("名前").closest("form");
  if (!form) throw new Error("追加フォームがない");
  return { onSubmit, form };
}
describe.each(["embedded", "popover"] as const)(
  "REQ-022-S01/S03/S05/S06/S07/S08 %s",
  (layout) => {
    it.each([
      undefined,
      () => {
        throw new DOMException("blocked", "SecurityError");
      },
    ])("API %oでも選択だけでは送信せず明示的に追加する", async (api) => {
      Object.defineProperty(HTMLInputElement.prototype, "showPicker", {
        configurable: true,
        value: api,
      });
      const { onSubmit, form } = setup(layout);
      fireEvent.change(screen.getByLabelText("期限"), {
        target: { value: "2026-11-10" },
      });
      fireEvent.click(screen.getByRole("button", { name: /^期限 / }));
      fireEvent.click(screen.getByRole("button", { name: "2026-11-12" }));
      expect(onSubmit).not.toHaveBeenCalled();
      fireEvent.submit(form);
      await waitFor(() =>
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "Release",
            due: "2026-11-12",
            projectId: "q",
          }),
        ),
      );
      await waitFor(() => expect(screen.queryByLabelText("名前")).toBeNull());
    });
    it("未入力と不正日付を拒否し、修正と保存失敗の後も入力を保持する", async () => {
      const { onSubmit, form } = setup(layout, false);
      fireEvent.submit(form);
      expect(
        screen.getByRole("dialog", { name: "期限のカレンダー" }),
      ).toBeTruthy();
      expect(onSubmit).not.toHaveBeenCalled();
      fireEvent.keyDown(
        screen.getByRole("dialog", { name: "期限のカレンダー" }),
        { key: "Escape" },
      );
      fireEvent.change(screen.getByLabelText("期限"), {
        target: { value: "2026-02-30" },
      });
      fireEvent.submit(form);
      expect(screen.getByRole("alert").textContent).toContain("実在する日付");
      expect(onSubmit).not.toHaveBeenCalled();
      fireEvent.change(screen.getByLabelText("期限"), {
        target: { value: "2026-11-23" },
      });
      fireEvent.submit(form);
      await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
      expect((screen.getByLabelText("期限") as HTMLInputElement).value).toBe(
        "2026-11-23",
      );
      expect((screen.getByLabelText("名前") as HTMLInputElement).value).toBe(
        "Release",
      );
      expect(
        (screen.getByLabelText("Project") as HTMLSelectElement).value,
      ).toBe("q");
    });
    it("Escと枠外でカレンダーだけを閉じ、矢印とEnterでも誤送信しない", () => {
      const { onSubmit } = setup(layout);
      fireEvent.change(screen.getByLabelText("期限"), {
        target: { value: "2026-11-10" },
      });
      const trigger = screen.getByRole("button", { name: /^期限 / });
      fireEvent.click(trigger);
      fireEvent.keyDown(screen.getByRole("button", { name: "2026-11-10" }), {
        key: "Escape",
      });
      expect(document.activeElement).toBe(trigger);
      expect(screen.getByLabelText("名前")).toBeTruthy();
      fireEvent.click(trigger);
      fireEvent.pointerDown(document.body);
      expect(screen.queryByRole("dialog")).toBeNull();
      fireEvent.click(trigger);
      fireEvent.keyDown(screen.getByRole("button", { name: "2026-11-10" }), {
        key: "ArrowRight",
      });
      fireEvent.keyDown(document.activeElement as HTMLElement, {
        key: "Enter",
      });
      expect((screen.getByLabelText("期限") as HTMLInputElement).value).toBe(
        "2026-11-11",
      );
      expect(onSubmit).not.toHaveBeenCalled();
      fireEvent.keyDown(screen.getByLabelText("名前"), { key: "Escape" });
      expect(screen.queryByLabelText("名前")).toBeNull();
    });
  },
);

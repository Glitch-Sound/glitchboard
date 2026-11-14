// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DatePicker } from "../../packages/webview/src/shared/ui/date-picker/index.js";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
function Fixture({ initial = "2026-11-10" }) {
  const [value, setValue] = useState(initial);
  return <DatePicker value={value} onChange={setValue} />;
}
const open = () =>
  fireEvent.click(screen.getByRole("button", { name: /^期限 / }));
const day = (date: string) => screen.getByRole("button", { name: date });

describe("REQ-022-S05/S06/S08 共通DatePicker", () => {
  it.each([
    undefined,
    () => {
      throw new DOMException("blocked", "SecurityError");
    },
  ])("native APIが%oでも日付を選択する", (api) => {
    Object.defineProperty(HTMLInputElement.prototype, "showPicker", {
      configurable: true,
      value: api,
    });
    render(<Fixture />);
    open();
    expect(
      screen.getByRole("dialog", { name: "期限のカレンダー" }),
    ).toBeTruthy();
    expect(day("2026-11-10").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(day("2026-11-12"));
    expect((screen.getByLabelText("期限") as HTMLInputElement).value).toBe(
      "2026-11-12",
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("年境界、うるう日、直接入力を暦日のまま保持する", () => {
    render(<Fixture initial="2026-12-31" />);
    open();
    fireEvent.click(screen.getByRole("button", { name: "翌月" }));
    fireEvent.click(day("2027-01-01"));
    expect((screen.getByLabelText("期限") as HTMLInputElement).value).toBe(
      "2027-01-01",
    );
    fireEvent.change(screen.getByLabelText("期限"), {
      target: { value: "2028-03-01" },
    });
    open();
    fireEvent.click(screen.getByRole("button", { name: "前月" }));
    fireEvent.click(day("2028-02-29"));
    expect((screen.getByLabelText("期限") as HTMLInputElement).value).toBe(
      "2028-02-29",
    );
  });
  it("未入力は日本時間の当月で開き、勝手に値を補わない", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-31T16:00:00Z"));
    render(<Fixture initial="" />);
    fireEvent.click(screen.getByRole("button", { name: "期限を選ぶ" }));
    expect(screen.getByText("2027年1月")).toBeTruthy();
    expect((screen.getByLabelText("期限") as HTMLInputElement).value).toBe("");
  });
  it("矢印で日と週を移動しEnter/Spaceで選択、Escapeはフォーカスを戻す", () => {
    render(<Fixture />);
    open();
    fireEvent.keyDown(day("2026-11-10"), { key: "ArrowRight" });
    expect(document.activeElement).toBe(day("2026-11-11"));
    fireEvent.keyDown(document.activeElement as HTMLElement, {
      key: "ArrowDown",
    });
    expect(document.activeElement).toBe(day("2026-11-18"));
    fireEvent.keyDown(document.activeElement as HTMLElement, {
      key: "ArrowLeft",
    });
    fireEvent.keyDown(document.activeElement as HTMLElement, {
      key: "ArrowUp",
    });
    expect(document.activeElement).toBe(day("2026-11-10"));
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "Enter" });
    expect(screen.queryByRole("dialog")).toBeNull();
    open();
    fireEvent.keyDown(day("2026-11-10"), { key: " " });
    expect(screen.queryByRole("dialog")).toBeNull();
    open();
    fireEvent.keyDown(day("2026-11-10"), { key: "Escape" });
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: /^期限 / }),
    );
    open();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

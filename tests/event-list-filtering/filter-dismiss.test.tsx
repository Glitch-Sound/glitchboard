// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { EventFilters } from "../../packages/webview/src/pages/event-list/index.js";

afterEach(cleanup);
it("REQ-020-S04 抽出条件は Escape と枠外で閉じ、Escape では入口へ戻る", () => {
  render(
    <EventFilters
      target="pending"
      projects={[]}
      projectEntries={[]}
      today="2026-11-14"
      onTargetChange={vi.fn()}
    />,
  );
  const trigger = screen.getByRole("button", { name: "抽出条件" });
  fireEvent.click(trigger);
  fireEvent.keyDown(screen.getByRole("button", { name: "すべて" }), {
    key: "Escape",
  });
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
  expect(document.activeElement).toBe(trigger);
  fireEvent.click(trigger);
  fireEvent.pointerDown(document.body);
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
});

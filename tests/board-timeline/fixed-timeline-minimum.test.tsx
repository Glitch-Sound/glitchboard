// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { BoardSplit } from "../../packages/webview/src/pages/board/ui/BoardSplit.js";

afterEach(cleanup);
it("REQ-031-S07 固定部分の最小高さを保ち、小さい画面ではボード全体に必要な高さを確保する", () => {
  const minimum = 180;
  const { container } = render(
    <BoardSplit minimumTop={minimum}>
      <div>Timeline</div>
      <div>Details</div>
    </BoardSplit>,
  );
  const content = container.querySelector(".board-content");
  if (!content) throw new Error("分割領域がない");
  Object.defineProperty(content, "clientHeight", { get: () => 532 });
  const separator = screen.getByRole("separator");
  for (let i = 0; i < 20; i++) fireEvent.keyDown(separator, { key: "ArrowUp" });
  expect(
    (Number(separator.getAttribute("aria-valuenow")) / 100) * 520,
  ).toBeGreaterThanOrEqual(minimum);
  expect(
    Number.parseFloat((content as HTMLElement).style.minHeight),
  ).toBeGreaterThan(minimum);
});

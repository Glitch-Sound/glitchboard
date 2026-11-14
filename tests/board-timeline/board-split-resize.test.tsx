// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BoardSplit } from "../../packages/webview/src/pages/board/ui/BoardSplit.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("REQ-031-S06 分割下限と画面縮小", () => {
  it.each(["ArrowUp", "ArrowDown"])(
    "%s で端まで動かしてから縮小しても下限を保つ",
    (key) => {
      let height = 900;
      let resize: () => void = () => {};
      vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(
        () => height,
      );
      vi.stubGlobal(
        "ResizeObserver",
        class {
          constructor(callback: () => void) {
            resize = callback;
          }
          observe() {}
          disconnect() {}
        },
      );
      render(
        <BoardSplit>
          <div>Timeline</div>
          <div>Details</div>
        </BoardSplit>,
      );
      const handle = screen.getByRole("separator");
      for (let i = 0; i < 20; i++) fireEvent.keyDown(handle, { key });
      height = 532;
      act(() => resize());
      const ratio = Number(handle.getAttribute("aria-valuenow")) / 100;
      expect(ratio).toBeGreaterThanOrEqual(0.15);
      expect(ratio).toBeLessThanOrEqual(0.85);
      fireEvent.keyDown(handle, { key: "Home" });
      expect(handle.getAttribute("aria-valuenow")).toBe("60");
    },
  );
});

// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const host = vi.hoisted(() => ({
  state: { timelineLayout: { width: 240, height: 56 } },
  postMessage: vi.fn(),
}));
vi.mock("../../packages/webview/src/app/bridge.js", () => ({
  localBridge: () => ({
    postMessage: host.postMessage,
    getState: () => host.state,
    setState: (value: typeof host.state) => {
      host.state = value;
    },
  }),
}));

import { BoardApp } from "../../packages/webview/src/app/board.js";

const emit = (data: unknown) =>
  act(() => window.dispatchEvent(new MessageEvent("message", { data })));
afterEach(() => {
  cleanup();
  host.postMessage.mockClear();
  host.state = { timelineLayout: { width: 240, height: 56 } };
});
it("REQ-040-S01 REQ-040-S13 旧保存値を引き継ぎ、保存失敗で寸法と入力を保ち、他の編集エラーを消さない", () => {
  render(<BoardApp />);
  expect(
    host.postMessage.mock.calls
      .map(([message]) => message)
      .filter((message) => message.type === "saveTimelineLayout"),
  ).toEqual([
    {
      type: "saveTimelineLayout",
      requestId: 1,
      layout: { width: 240, height: 56 },
    },
  ]);
  emit({
    type: "snapshot",
    payload: {
      version: 1,
      projects: [
        {
          id: "00000000-0000-4000-8000-000000000001",
          name: "Project",
          color: "#123456",
          events: [],
        },
      ],
      selectedEventId: null,
      error: null,
      settings: { workdays_off: [], public_holidays: false },
      projectEntries: [],
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "Projectを追加" }));
  const draft = screen.getByRole("textbox", { name: "名前" });
  fireEvent.change(draft, { target: { value: "未保存の名前" } });
  const width = screen.getByRole("separator", {
    name: "Project列幅",
  });
  fireEvent.keyDown(width, { key: "ArrowRight" });
  const request = host.postMessage.mock.calls
    .map(([message]) => message)
    .filter((message) => message.type === "saveTimelineLayout")
    .at(-1);
  expect(request).toEqual({
    type: "saveTimelineLayout",
    requestId: 2,
    layout: { width: 248, height: 56 },
  });
  emit({
    type: "timelineLayoutResult",
    requestId: 2,
    ok: false,
    error: "表示設定を保存できない",
  });
  expect(screen.getByRole("alert").textContent).toContain(
    "表示設定を保存できない",
  );
  expect(width.getAttribute("aria-valuenow")).toBe("248");
  expect(draft).toHaveProperty("value", "未保存の名前");
  emit({ type: "timelineLayoutResult", requestId: 1, ok: true });
  expect(screen.getByRole("alert").textContent).toContain(
    "表示設定を保存できない",
  );
  emit({
    type: "operationResult",
    payload: { ok: false, error: "編集の保存失敗" },
  });
  emit({ type: "timelineLayoutResult", requestId: 2, ok: true });
  expect(screen.getByRole("alert").textContent).toContain("編集の保存失敗");
});

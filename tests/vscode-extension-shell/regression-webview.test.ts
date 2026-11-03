// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Snapshot } from "../../packages/shared/src/domain/messages.js";

const postMessage = vi.hoisted(() => vi.fn());
vi.mock("../../packages/webview/src/app/bridge.js", () => ({
  localBridge: () => ({ postMessage }),
}));

import { BoardApp } from "../../packages/webview/src/app/board.js";
import { EventsApp } from "../../packages/webview/src/app/events.js";

const projectId = "11111111-1111-4111-8111-111111111111";
const eventId = "22222222-2222-4222-8222-222222222222";

function snapshot(due = "2026-11-02"): Snapshot {
  return {
    version: 1,
    selectedEventId: null,
    error: null,
    settings: { workdays_off: ["sat", "sun"], public_holidays: false },
    projects: [
      {
        id: projectId,
        name: "Alpha",
        color: "#123456",
        events: [{ id: eventId, name: "Launch", due, stories: [] }],
      },
    ],
    projectEntries: [
      { file: "A.yaml", load: true, name: "Alpha" },
      { file: "B.yaml", load: false, name: "Beta" },
    ],
  };
}

function emit(data: unknown) {
  act(() => window.dispatchEvent(new MessageEvent("message", { data })));
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  postMessage.mockClear();
});

describe("正式仕様のWebview回帰", () => {
  it("REQ-019-S03/REQ-020-S03: 危険なEventを赤くし、未読込Projectの名前を示す", () => {
    vi.setSystemTime(new Date("2026-11-03T03:00:00Z"));
    render(createElement(EventsApp));
    emit({ type: "snapshot", payload: snapshot() });
    expect(screen.getByRole("button", { name: /Launch/ }).className).toContain(
      "danger-text",
    );
    fireEvent.click(screen.getByRole("button", { name: "抽出条件" }));
    expect(screen.getByText("Beta")).toBeTruthy();
  });

  it("REQ-022-S03/REQ-014-S02: 追加失敗の理由を上部に示し、入力を残す", async () => {
    render(createElement(BoardApp));
    fireEvent.click(screen.getByRole("button", { name: "Projectを追加" }));
    fireEvent.change(screen.getByRole("textbox", { name: "名前" }), {
      target: { value: "Alpha" },
    });
    fireEvent.click(screen.getByRole("button", { name: "追加" }));
    const request = [...postMessage.mock.calls]
      .reverse()
      .find(
        (call) => (call[0] as { type?: string }).type === "createProject",
      )?.[0];
    expect(request).toBeTruthy();
    emit({
      type: "operationResult",
      requestId: request.requestId,
      payload: { ok: false, error: "保存に失敗" },
    });
    expect(screen.getByRole("alert").textContent).toBe("保存に失敗");
    expect(screen.getByRole("textbox", { name: "名前" })).toHaveProperty(
      "value",
      "Alpha",
    );
  });

  it("REQ-025-S03: 削除拒否の理由を上部に示す", () => {
    render(createElement(BoardApp));
    emit({ type: "snapshot", payload: snapshot() });
    fireEvent.click(screen.getByRole("button", { name: "Alphaの操作" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "削除" }));
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));
    expect(
      postMessage.mock.calls.some(([message]) => message.type === "deleteItem"),
    ).toBe(true);
    emit({
      type: "operationResult",
      payload: { ok: false, error: "表示内容が更新されたため、削除をやり直す" },
    });
    expect(screen.getByRole("alert").textContent).toContain("削除をやり直す");
  });

  it("REQ-013-S04: 日付変更後に今日の列と期限切れ分類を更新する", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-03T14:59:50Z"));
    render(createElement(EventsApp));
    emit({ type: "snapshot", payload: snapshot("2026-11-03") });
    expect(screen.queryByText("期限切れ・未完了")).toBeNull();
    act(() => vi.advanceTimersByTime(30_000));
    expect(screen.getByText("期限切れ・未完了")).toBeTruthy();
  });

  it("REQ-013-S04: ボードの今日の列を日付変更後に移す", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-03T14:59:50Z"));
    const { container } = render(createElement(BoardApp));
    emit({ type: "snapshot", payload: snapshot("2026-11-03") });
    expect(
      container.querySelector('th.today time[datetime="2026-11-03"]'),
    ).toBeTruthy();
    act(() => vi.advanceTimersByTime(30_000));
    expect(
      container.querySelector('th.today time[datetime="2026-11-04"]'),
    ).toBeTruthy();
  });

  it("REQ-029-S01: 未設定時に選択と作成を案内する", () => {
    render(createElement(EventsApp));
    emit({ type: "unconfigured" });
    fireEvent.click(screen.getByRole("button", { name: "manage.yamlを選ぶ" }));
    fireEvent.click(screen.getByRole("button", { name: "新しく作る" }));
    expect(postMessage.mock.calls.map(([message]) => message.type)).toContain(
      "chooseManage",
    );
    expect(postMessage.mock.calls.map(([message]) => message.type)).toContain(
      "createManage",
    );
  });
});

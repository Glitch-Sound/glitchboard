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
import { snapshotMessageSchema } from "../../packages/shared/src/domain/messages.js";

const postMessage = vi.hoisted(() => vi.fn());
vi.mock("../../packages/webview/src/app/bridge.js", () => ({
  localBridge: () => ({ postMessage }),
}));

import { BoardApp } from "../../packages/webview/src/app/board.js";
import { EventsApp } from "../../packages/webview/src/app/events.js";

const payload = {
  version: 1,
  selectedEventId: "22222222-2222-4222-8222-222222222222",
  error: null,
  settings: { workdays_off: ["sat", "sun"], public_holidays: false },
  projects: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Alpha",
      color: "#123456",
      events: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          name: "Launch",
          due: "2099-01-01",
          stories: [],
        },
      ],
    },
  ],
  projectEntries: [{ file: "a.yaml", load: true, name: "Alpha" }],
};
function emit(data: unknown) {
  act(() => {
    window.dispatchEvent(new MessageEvent("message", { data }));
  });
}
afterEach(() => {
  cleanup();
  postMessage.mockClear();
});
for (const [name, App] of [
  ["board", BoardApp],
  ["events", EventsApp],
] as const) {
  describe(`REQ-029 ${name}`, () => {
    it("REQ-029-S01/REQ-029-S09 未設定時に二つのbuttonを操作できる", () => {
      render(createElement(App));
      emit({ type: "unconfigured" });
      const choose = screen.getByRole("button", { name: "manage.yamlを選ぶ" });
      const create = screen.getByRole("button", { name: "新しく作る" });
      expect(choose.tagName).toBe("BUTTON");
      expect(create.tagName).toBe("BUTTON");
      fireEvent.click(choose);
      fireEvent.click(create);
      expect(postMessage.mock.calls.map(([m]) => m.type)).toEqual([
        "ready",
        "chooseManage",
        "createManage",
      ]);
    });
    it("REQ-029-S02/REQ-029-S03/REQ-029-S10 不在のパスとボタンを出し直前表示を維持して復帰する", () => {
      render(createElement(App));
      emit({ type: "snapshot", payload });
      emit({
        type: "snapshot",
        payload: {
          ...payload,
          error: "manage.yamlが見つかりません",
          manageAvailability: {
            status: "missing",
            path: "/data/long-path/manage.yaml",
          },
        },
      });
      expect(screen.getByText("/data/long-path/manage.yaml")).toBeTruthy();
      expect(screen.getByRole("button", { name: "新しく作る" })).toBeTruthy();
      expect(screen.getAllByText(/Launch/).length).toBeGreaterThan(0);
      emit({
        type: "snapshot",
        payload: { ...payload, manageAvailability: { status: "ready" } },
      });
      expect(
        screen.queryByRole("region", { name: "manage.yamlの設定" }),
      ).toBeNull();
      expect(screen.queryByRole("alert")).toBeNull();
    });
    it("REQ-029-S02 初回の不在も案内する", () => {
      render(createElement(App));
      emit({
        type: "snapshot",
        payload: {
          ...payload,
          projects: [],
          projectEntries: [],
          manageAvailability: {
            status: "missing",
            path: "/missing/manage.yaml",
          },
        },
      });
      expect(
        screen.getByRole("button", { name: "manage.yamlを選ぶ" }),
      ).toBeTruthy();
      expect(screen.queryByText("読み込み中")).toBeNull();
    });
    it("REQ-029-S07/REQ-029-S04 失敗後も再操作でき、復帰時に操作エラーが消える", () => {
      render(createElement(App));
      emit({ type: "unconfigured" });
      fireEvent.click(screen.getByRole("button", { name: "新しく作る" }));
      emit({
        type: "operationResult",
        payload: { ok: false, error: "書込不可" },
      });
      expect(screen.getByRole("alert").textContent).toBe("書込不可");
      fireEvent.click(
        screen.getByRole("button", { name: "manage.yamlを選ぶ" }),
      );
      emit({ type: "snapshot", payload });
      expect(screen.queryByRole("alert")).toBeNull();
      expect(screen.queryByRole("button", { name: "新しく作る" })).toBeNull();
    });
    it("REQ-029-S08 不正な不在通知を拒否する", () => {
      render(createElement(App));
      emit({ type: "snapshot", payload });
      const invalid = {
        type: "snapshot",
        payload: { ...payload, manageAvailability: { status: "missing" } },
      };
      expect(snapshotMessageSchema.safeParse(invalid).success).toBe(false);
      emit(invalid);
      expect(screen.queryByRole("button", { name: "新しく作る" })).toBeNull();
      expect(screen.getAllByText(/Launch/).length).toBeGreaterThan(0);
    });
  });
}

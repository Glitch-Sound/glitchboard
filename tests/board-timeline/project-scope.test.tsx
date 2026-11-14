// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const postMessage = vi.hoisted(() => vi.fn());
vi.mock("../../packages/webview/src/app/bridge.js", () => ({
  localBridge: () => ({ postMessage }),
}));

import { BoardApp } from "../../packages/webview/src/app/board.js";
import { EventsApp } from "../../packages/webview/src/app/events.js";

const ids = {
  project: "11111111-1111-4111-8111-111111111111",
  event: "22222222-2222-4222-8222-222222222222",
  task: "44444444-4444-4444-8444-444444444444",
};
const snapshot = {
  version: 1,
  selectedEventId: ids.event,
  selectedProjectFile: "B.yaml",
  error: null,
  settings: { workdays_off: [], public_holidays: false },
  projectEntries: ["A", "B"].map((name) => ({
    file: `${name}.yaml`,
    load: true,
    name,
  })),
  projects: ["A", "B"].map((name) => ({
    id: ids.project,
    sourceFile: `${name}.yaml`,
    name,
    color: "#123456",
    events: [
      {
        id: ids.event,
        name: `${name} Event`,
        due: "2099-11-20",
        stories: [],
        tasks: [{ id: ids.task, name: `${name} Task`, points: 3 }],
      },
    ],
  })),
};
const emit = () =>
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "snapshot", payload: snapshot },
      }),
    );
  });
afterEach(() => {
  cleanup();
  postMessage.mockClear();
});
describe("Projectを含む画面の対象参照", () => {
  it("REQ-005-S05 2番目のEventと詳細を表示し、編集、完了、削除に同じファイル参照を送る", () => {
    render(<BoardApp />);
    emit();
    expect(screen.getByRole("button", { name: "B Task" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "A Task" })).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: "B Taskの完了" }));
    expect(
      postMessage.mock.calls
        .map(([m]) => m)
        .find((m) => m.type === "setTaskDone"),
    ).toEqual({
      type: "setTaskDone",
      projectFile: "B.yaml",
      taskId: ids.task,
      done: true,
    });
    fireEvent.click(screen.getByRole("button", { name: "B Task" }));
    const panel = screen.getByRole("dialog", { name: "詳細パネル" });
    expect(within(panel).getByRole("heading", { name: "B Task" })).toBeTruthy();
    fireEvent.click(within(panel).getByRole("button", { name: "編集" }));
    fireEvent.change(within(panel).getByLabelText("名前"), {
      target: { value: "Changed B" },
    });
    fireEvent.click(within(panel).getByRole("button", { name: "保存" }));
    expect(
      postMessage.mock.calls.map(([m]) => m).find((m) => m.type === "editItem"),
    ).toMatchObject({
      kind: "task",
      projectFile: "B.yaml",
      id: ids.task,
      patch: { name: "Changed B" },
    });
    fireEvent.click(within(panel).getByRole("button", { name: "削除" }));
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));
    expect(
      postMessage.mock.calls
        .map(([m]) => m)
        .find((m) => m.type === "deleteItem"),
    ).toMatchObject({ kind: "task", projectFile: "B.yaml", id: ids.task });
  });
  it("REQ-005-S05 サイドバーの同一Event IDを別行として選択できる", () => {
    render(<EventsApp />);
    emit();
    fireEvent.click(screen.getByRole("button", { name: /B Event/ }));
    expect(
      postMessage.mock.calls
        .map(([m]) => m)
        .find((m) => m.type === "selectEvent"),
    ).toEqual({
      type: "selectEvent",
      eventId: ids.event,
      projectFile: "B.yaml",
    });
  });
});

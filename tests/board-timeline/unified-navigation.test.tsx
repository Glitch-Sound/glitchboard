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
  localBridge: () => ({ postMessage, getState: () => ({}), setState: vi.fn() }),
}));

import { BoardApp } from "../../packages/webview/src/app/board.js";
import { EventsApp } from "../../packages/webview/src/app/events.js";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const project = {
  id: id(1),
  sourceFile: "A.yaml",
  name: "Alpha",
  color: "#123456",
  events: [
    {
      id: id(2),
      name: "First",
      due: "2099-11-20",
      tasks: [{ id: id(3), name: "Direct", points: 3 }],
      stories: [
        { id: id(4), name: "Group", tasks: [{ id: id(5), name: "Grouped" }] },
      ],
    },
    { id: id(6), name: "Second", due: "2099-11-21", tasks: [], stories: [] },
  ],
};
function start() {
  render(<BoardApp />);
  act(() =>
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: "snapshot",
          payload: {
            version: 1,
            projects: [project],
            selectedEventId: id(2),
            selectedProjectFile: "A.yaml",
            error: null,
            settings: { workdays_off: [], public_holidays: false },
            projectEntries: [],
          },
        },
      }),
    ),
  );
}
function panel() {
  return within(screen.getByRole("dialog", { name: "詳細パネル" }));
}
function openEdit() {
  start();
  fireEvent.click(screen.getByRole("button", { name: "Directの詳細" }));
  fireEvent.click(panel().getByRole("button", { name: "編集" }));
  fireEvent.change(panel().getByLabelText("名前"), {
    target: { value: "Changed" },
  });
  postMessage.mockClear();
}
function navigateSidebar() {
  act(() =>
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: "navigateRecord",
          payload: {
            kind: "event",
            id: id(6),
            projectFile: "A.yaml",
            openDetail: true,
          },
        },
      }),
    ),
  );
}
afterEach(() => {
  cleanup();
  postMessage.mockReset();
});
describe("統一した選択と詳細", () => {
  it("REQ-035-S01 名前と行は選択し、詳細は独立し、開いていれば追従する", () => {
    start();
    fireEvent.click(screen.getByRole("button", { name: "Alpha" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Direct" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Directの詳細" }));
    expect(panel().getByRole("heading", { name: "Alpha" })).toBeTruthy();
    expect(panel().getByText("TASK : Direct")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Group.*Task/ }));
    expect(panel().getByText("STORY : Group")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Grouped" })).toBeTruthy();
  });
  it("REQ-033-S05 REQ-037-S01 見出しと仮想グループは Story と Taks で上部にEvent追加がない", () => {
    start();
    expect(screen.getByRole("heading", { name: "Story" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Taks0/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Eventを追加" })).toBeNull();
  });
  it("REQ-041-S02 REQ-041-S04 左からの切替をキャンセルし、破棄を選ぶまで入力と選択を保つ", () => {
    openEdit();
    navigateSidebar();
    const confirm = within(
      screen.getByRole("alertdialog", { name: "未保存の編集" }),
    );
    fireEvent.click(confirm.getByRole("button", { name: "キャンセル" }));
    expect(panel().getByLabelText("名前")).toHaveProperty("value", "Changed");
    expect(postMessage.mock.calls.some(([m]) => m.type === "selectEvent")).toBe(
      false,
    );
    navigateSidebar();
    fireEvent.click(screen.getByRole("button", { name: "破棄して進む" }));
    expect(panel().getByText("EVENT : Second")).toBeTruthy();
    expect(
      postMessage.mock.calls
        .filter(([m]) => m.type === "selectEvent")
        .map(([m]) => m),
    ).toEqual([{ type: "selectEvent", eventId: id(6), projectFile: "A.yaml" }]);
  });
  it("REQ-041-S01 REQ-041-S03 保存失敗は移動せず、成功後だけ移動し二重送信しない", async () => {
    openEdit();
    navigateSidebar();
    fireEvent.click(screen.getByRole("button", { name: "保存して進む" }));
    const request = postMessage.mock.calls
      .map(([m]) => m)
      .find((m) => m.type === "editItem");
    expect(request).toMatchObject({
      id: id(3),
      projectFile: "A.yaml",
      patch: { name: "Changed" },
    });
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "保存中…",
      }),
    );
    expect(
      postMessage.mock.calls.filter(([m]) => m.type === "editItem"),
    ).toHaveLength(1);
    await act(async () =>
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "operationResult",
            requestId: request.requestId,
            payload: { ok: false, error: "Failure" },
          },
        }),
      ),
    );
    expect(panel().getByLabelText("名前")).toHaveProperty("value", "Changed");
    expect(panel().getByText("TASK : Direct")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "保存して進む" }));
    const retry = postMessage.mock.calls
      .map(([m]) => m)
      .filter((m) => m.type === "editItem")
      .at(-1);
    await act(async () =>
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "operationResult",
            requestId: retry.requestId,
            payload: { ok: true },
          },
        }),
      ),
    );
    expect(panel().getByText("EVENT : Second")).toBeTruthy();
  });
  it("REQ-021-S02 左の詳細ボタンは行の選択要求と競合しない", () => {
    render(<EventsApp />);
    act(() =>
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "snapshot",
            payload: {
              version: 1,
              projects: [project],
              selectedEventId: id(2),
              selectedProjectFile: "A.yaml",
              error: null,
              settings: { workdays_off: [], public_holidays: false },
              projectEntries: [],
            },
          },
        }),
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Firstの詳細" }));
    expect(
      postMessage.mock.calls
        .filter(([m]) => m.type === "selectEvent")
        .map(([m]) => m),
    ).toEqual([
      {
        type: "selectEvent",
        eventId: id(2),
        projectFile: "A.yaml",
        openDetail: true,
      },
    ]);
  });
  it("REQ-041-S03 不正な期限は移動せず、修正した元Eventへ保存する", async () => {
    start();
    fireEvent.click(screen.getByRole("button", { name: "Firstの詳細" }));
    fireEvent.click(panel().getByRole("button", { name: "編集" }));
    fireEvent.change(panel().getByLabelText("期限"), {
      target: { value: "2099-02-30" },
    });
    postMessage.mockClear();
    navigateSidebar();
    fireEvent.click(screen.getByRole("button", { name: "保存して進む" }));
    expect(
      postMessage.mock.calls.filter(([m]) => m.type === "editItem"),
    ).toHaveLength(0);
    expect(panel().getByLabelText("期限")).toHaveProperty(
      "value",
      "2099-02-30",
    );
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    fireEvent.change(panel().getByLabelText("期限"), {
      target: { value: "2099-02-28" },
    });
    navigateSidebar();
    fireEvent.click(screen.getByRole("button", { name: "保存して進む" }));
    const request = postMessage.mock.calls
      .map(([m]) => m)
      .find((m) => m.type === "editItem");
    expect(request).toMatchObject({
      id: id(2),
      patch: { name: "First", due: "2099-02-28" },
    });
    await act(async () =>
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "operationResult",
            requestId: request.requestId,
            payload: { ok: true },
          },
        }),
      ),
    );
    expect(panel().getByText("EVENT : Second")).toBeTruthy();
  });
  it("REQ-041-S01 補足を元Taskへ保存し、確認中の追加移動は最初の移動先を変えない", async () => {
    start();
    fireEvent.click(screen.getByRole("button", { name: "Directの詳細" }));
    fireEvent.click(panel().getByRole("button", { name: "+ 補足を追加" }));
    fireEvent.change(panel().getByLabelText("補足"), {
      target: { value: "Draft note" },
    });
    navigateSidebar();
    fireEvent.click(screen.getByRole("button", { name: /Group0/ }));
    fireEvent.click(screen.getByRole("button", { name: "保存して進む" }));
    const request = postMessage.mock.calls
      .map(([m]) => m)
      .find((m) => m.type === "editItem");
    expect(request).toMatchObject({ id: id(3), patch: { note: "Draft note" } });
    await act(async () =>
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "operationResult",
            requestId: request.requestId,
            payload: { ok: true },
          },
        }),
      ),
    );
    expect(panel().getByText("EVENT : Second")).toBeTruthy();
  });
  it("REQ-035-S01 仮想TaksもStory選択から戻り、独立操作は詳細対象を変えない", () => {
    start();
    fireEvent.click(screen.getByRole("button", { name: /Group0/ }));
    expect(screen.getByRole("button", { name: "Grouped" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^Taks0/ }));
    expect(screen.getByRole("button", { name: "Direct" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Firstの詳細" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Directの完了" }));
    expect(panel().getByText("EVENT : First")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Directを選択" }));
    expect(panel().getByText("TASK : Direct")).toBeTruthy();
  });
  it("REQ-035-S01 空のProject選択で別Projectの下位情報を残さない", () => {
    start();
    act(() =>
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "snapshot",
            payload: {
              version: 2,
              projects: [
                project,
                {
                  id: id(9),
                  sourceFile: "Empty.yaml",
                  name: "Empty",
                  color: "#654321",
                  events: [],
                },
              ],
              selectedEventId: id(2),
              selectedProjectFile: "A.yaml",
              error: null,
              settings: { workdays_off: [], public_holidays: false },
              projectEntries: [],
            },
          },
        }),
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Empty" }));
    expect(screen.queryByRole("region", { name: "Event詳細" })).toBeNull();
    expect(screen.getByText("Event を追加しましょう")).toBeTruthy();
  });
});

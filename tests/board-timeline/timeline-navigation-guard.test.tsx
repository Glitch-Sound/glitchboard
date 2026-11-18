// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const postMessage = vi.hoisted(() => vi.fn());
vi.mock("../../packages/webview/src/app/bridge.js", () => ({
  localBridge: () => ({ postMessage }),
}));

import { BoardApp } from "../../packages/webview/src/app/board.js";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const projects = ["A", "B"].map((name) => ({
  id: id(1),
  sourceFile: `${name}.yaml`,
  name: `Project ${name}`,
  color: "#123456",
  events: [
    {
      id: id(2),
      name: `Event ${name}`,
      due: "2026-11-19",
      stories: [],
      tasks: [{ id: id(3), name: `Task ${name}`, points: 3 }],
    },
    {
      id: id(4),
      name: `Other ${name}`,
      due: "2026-11-20",
      stories: [],
      tasks: [],
    },
  ],
}));
afterEach(() => {
  cleanup();
  postMessage.mockClear();
  vi.useRealTimers();
});
function start(sameDay = false) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-18T12:00:00Z"));
  const view = render(<BoardApp />);
  act(() =>
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: "snapshot",
          payload: {
            version: 1,
            projects: projects.map((p) => ({
              ...p,
              events: p.events.map((e) => ({
                ...e,
                due: sameDay ? "2026-11-19" : e.due,
              })),
            })),
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
  fireEvent.click(screen.getByRole("button", { name: "Task Aの詳細" }));
  fireEvent.click(
    within(screen.getByRole("dialog", { name: "詳細パネル" })).getByRole(
      "button",
      { name: "編集" },
    ),
  );
  fireEvent.change(screen.getByRole("textbox", { name: "名前" }), {
    target: { value: "Changed A" },
  });
  postMessage.mockClear();
  const choose = () => {
    const row = Array.from(
      view.container.querySelectorAll(".project-row"),
    ).find((n) => n.textContent?.includes("Project B"));
    if (!row) throw new Error("B row missing");
    if (sameDay) {
      fireEvent.click(
        within(row as HTMLElement).getByRole("button", { name: "2件のEvent" }),
      );
      fireEvent.click(
        within(row as HTMLElement).getByRole("option", { name: "Event B" }),
      );
    } else
      fireEvent.click(
        within(row as HTMLElement).getByRole("button", { name: "Event B" }),
      );
  };
  return { view, choose };
}
function requests(type: string) {
  return postMessage.mock.calls.map(([m]) => m).filter((m) => m.type === type);
}
function respond(request: { requestId: string }, ok: boolean) {
  return act(async () => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: "operationResult",
          requestId: request.requestId,
          payload: ok ? { ok: true } : { ok: false, error: "Write refused" },
        },
      }),
    );
  });
}
it("REQ-016-S06 REQ-041-S01/S03 単独マーカーへの移動は元のProjectへ保存し、失敗では対象と入力を保持する", async () => {
  const { choose } = start();
  choose();
  fireEvent.click(screen.getByRole("button", { name: "保存して進む" }));
  let edit = requests("editItem")[0];
  expect(edit).toMatchObject({
    kind: "task",
    id: id(3),
    projectFile: "A.yaml",
    patch: { name: "Changed A" },
  });
  await respond(edit, false);
  expect(screen.getByRole("textbox", { name: "名前" })).toHaveProperty(
    "value",
    "Changed A",
  );
  expect(screen.getByText("TASK : Task A")).toBeTruthy();
  expect(requests("selectEvent")).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "保存して進む" }));
  edit = requests("editItem")[1];
  await respond(edit, true);
  expect(requests("editItem").map(({ requestId, ...r }) => r)).toEqual(
    Array(2).fill({
      type: "editItem",
      kind: "task",
      id: id(3),
      projectFile: "A.yaml",
      patch: { name: "Changed A" },
    }),
  );
  expect(requests("selectEvent")).toEqual([
    { type: "selectEvent", eventId: id(2), projectFile: "B.yaml" },
  ]);
  expect(screen.getByText("EVENT : Event B")).toBeTruthy();
});
it("REQ-016-S06 REQ-041-S02 同日一覧への移動をキャンセルすると入力が残り、破棄では送信せず移動する", () => {
  const { choose } = start(true);
  choose();
  fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
  expect(screen.getByRole("textbox", { name: "名前" })).toHaveProperty(
    "value",
    "Changed A",
  );
  expect(screen.getByText("TASK : Task A")).toBeTruthy();
  expect(requests("editItem")).toHaveLength(0);
  expect(requests("selectEvent")).toHaveLength(0);
  choose();
  fireEvent.click(screen.getByRole("button", { name: "破棄して進む" }));
  expect(requests("editItem")).toHaveLength(0);
  expect(requests("selectEvent")).toEqual([
    { type: "selectEvent", eventId: id(2), projectFile: "B.yaml" },
  ]);
  expect(screen.getByText("EVENT : Event B")).toBeTruthy();
});

// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { scopedId } from "../../packages/shared/src/domain/identity.js";
import type { Snapshot } from "../../packages/shared/src/domain/messages.js";

const postMessage = vi.hoisted(() => vi.fn());
vi.mock("../../packages/webview/src/app/bridge.js", () => ({
  localBridge: () => ({ postMessage }),
}));

import { BoardApp } from "../../packages/webview/src/app/board.js";
import { scopedOperation } from "../../packages/webview/src/app/operations.js";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const task = (n: number) => ({ id: id(n), name: `Task ${n}` });
const event = {
  id: id(2),
  name: "Event",
  due: "2099-01-01",
  tasks: [task(3), task(4)],
  stories: [
    { id: id(5), name: "Story 5", tasks: [task(7), task(8)] },
    { id: id(6), name: "Story 6", tasks: [] },
  ],
};
const snapshot: Snapshot = {
  version: 1,
  projects: [
    {
      id: id(1),
      name: "Alpha",
      color: "#123456",
      sourceFile: "a.yaml",
      events: [event],
    },
  ],
  selectedEventId: event.id,
  selectedProjectFile: "a.yaml",
  error: null,
  settings: { workdays_off: [], public_holidays: false },
  projectEntries: [{ file: "a.yaml", name: "Alpha", load: true }],
};
const emit = (data: unknown) =>
  act(() => {
    window.dispatchEvent(new MessageEvent("message", { data }));
  });
afterEach(() => {
  cleanup();
  postMessage.mockClear();
});
it("REQ-045-S05/S06 Task並べ替えの保存失敗と再配信で詳細と追加の下書きを保持する", async () => {
  render(<BoardApp />);
  emit({ type: "snapshot", payload: snapshot });
  fireEvent.click(screen.getByRole("button", { name: "Taskを追加" }));
  const draft = screen.getByRole("textbox", { name: "名前" });
  fireEvent.change(draft, { target: { value: "追加中" } });
  fireEvent.click(screen.getByRole("button", { name: "Task 3の詳細" }));
  const dialog = screen.getByRole("dialog", { name: "詳細パネル" });
  fireEvent.click(within(dialog).getByRole("button", { name: /^編集$/ }));
  const detailDraft = within(dialog).getByRole("textbox", { name: "名前" });
  fireEvent.change(detailDraft, { target: { value: "詳細編集中" } });
  const handle = screen.getByRole("button", { name: "Task 3を並べ替え" });
  fireEvent.keyDown(handle, { key: "ArrowDown" });
  const request = postMessage.mock.calls
    .map(([m]) => m)
    .find((m) => m.type === "moveTask");
  expect(request).toMatchObject({
    type: "moveTask",
    projectFile: "a.yaml",
    eventId: id(2),
    storyId: null,
    taskId: id(3),
    targetTaskId: id(4),
    placement: "after",
  });
  emit({
    type: "operationResult",
    requestId: request.requestId,
    payload: { ok: false, error: "EACCES: 保存できない" },
  });
  await waitFor(() => expect(handle).toHaveProperty("disabled", false));
  expect(screen.getByRole("alert").textContent).toContain(
    "EACCES: 保存できない",
  );
  expect(draft).toHaveProperty("value", "追加中");
  expect(detailDraft).toHaveProperty("value", "詳細編集中");
  fireEvent.keyDown(handle, { key: "ArrowDown" });
  const next = postMessage.mock.calls
    .map(([m]) => m)
    .filter((m) => m.type === "moveTask")
    .at(-1);
  const saved = structuredClone(snapshot);
  saved.version++;
  saved.projects[0].events[0].tasks = [event.tasks[1], event.tasks[0]];
  emit({ type: "snapshot", payload: saved });
  emit({
    type: "operationResult",
    requestId: next.requestId,
    payload: { ok: true },
  });
  await waitFor(() => expect(handle).toHaveProperty("disabled", false));
  expect(
    [...document.querySelectorAll(".task-line .task-name")].map(
      (n) => n.textContent,
    ),
  ).toEqual(["Task 4", "Task 3"]);
  expect(draft).toHaveProperty("value", "追加中");
  expect(detailDraft).toHaveProperty("value", "詳細編集中");
  expect(screen.queryByRole("alertdialog")).toBeNull();
});
it("REQ-045-S01 REQ-045-S07 Storyの親と移動先を同じProject参照へ変換する", () => {
  expect(
    scopedOperation({
      type: "moveStory",
      eventId: scopedId("a.yaml", id(2)),
      storyId: scopedId("a.yaml", id(5)),
      targetStoryId: scopedId("a.yaml", id(6)),
      placement: "before",
    }),
  ).toEqual({
    type: "moveStory",
    projectFile: "a.yaml",
    eventId: id(2),
    storyId: id(5),
    targetStoryId: id(6),
    placement: "before",
  });
  expect(
    scopedOperation({
      type: "moveTask",
      eventId: scopedId("a.yaml", id(2)),
      storyId: scopedId("a.yaml", id(5)),
      taskId: scopedId("a.yaml", id(7)),
      targetTaskId: scopedId("b.yaml", id(8)),
      placement: "after",
    }),
  ).toEqual({
    type: "moveTask",
    projectFile: "a.yaml",
    targetProjectFile: "b.yaml",
    eventId: id(2),
    storyId: id(5),
    taskId: id(7),
    targetTaskId: id(8),
    placement: "after",
  });
});

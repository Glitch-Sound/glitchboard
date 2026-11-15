// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventDetails } from "../../packages/webview/src/widgets/event-details/ui/EventDetails.js";

const tasks = ["Task A", "Task B", "Task C"].map((name) => ({
  id: name,
  name,
}));
const event = {
  id: "Event",
  name: "Event",
  due: "2026-12-20",
  tasks,
  stories: ["Story A", "Story B", "Story C"].map((name) => ({
    id: name,
    name,
    tasks: tasks.map((t) => ({ ...t, id: `${name} ${t.id}` })),
  })),
};
afterEach(cleanup);
function setup(group: string | null = null, onMove = vi.fn(async () => true)) {
  const select = vi.fn(),
    detail = vi.fn();
  const result = render(
    <EventDetails
      event={event}
      selectedStoryId={group}
      today="2026-11-15"
      prediction={null}
      onSelectRecord={select}
      onOpenDetail={detail}
      onAddTask={vi.fn()}
      onAddEventTask={vi.fn()}
      onMoveStory={onMove}
      onMoveTask={onMove}
    />,
  );
  return { ...result, onMove, select, detail };
}
function drag(handle: HTMLElement, row: HTMLElement, y: number) {
  const transfer = { setData: vi.fn(), setDragImage: vi.fn() };
  fireEvent.dragStart(handle, { dataTransfer: transfer });
  const send = (type: string) => {
    const e = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientY: y,
    });
    Object.defineProperty(e, "dataTransfer", { value: transfer });
    fireEvent(row, e);
  };
  send("dragover");
  return { drop: () => send("drop"), transfer };
}
describe("StoryとTaskの行操作", () => {
  it("REQ-045-S03/S04 空と1件では移動要求を送らない", () => {
    const { rerender, onMove } = setup();
    const one = { ...event, tasks: [tasks[0]], stories: [event.stories[0]] };
    rerender(
      <EventDetails
        event={one}
        selectedStoryId={null}
        today="2026-11-15"
        prediction={null}
        onMoveStory={onMove}
        onMoveTask={onMove}
      />,
    );
    for (const name of ["Story Aを並べ替え", "Task Aを並べ替え"]) {
      const handle = screen.getByRole("button", { name });
      fireEvent.keyDown(handle, { key: "ArrowUp" });
      fireEvent.keyDown(handle, { key: "ArrowDown" });
    }
    expect(onMove).not.toHaveBeenCalled();
    rerender(
      <EventDetails
        event={{ ...event, tasks: [], stories: [] }}
        today="2026-11-15"
        prediction={null}
        onMoveStory={onMove}
        onMoveTask={onMove}
      />,
    );
    expect(screen.queryAllByRole("button", { name: /を並べ替え$/ })).toEqual(
      [],
    );
    expect(onMove).not.toHaveBeenCalled();
  });

  it.each([
    ["Story", 110, "before"],
    ["Task", 140, "after"],
  ] as const)(
    "REQ-045-S01/S02/S06 %sの前後へ保存し、選択と詳細を変えない",
    async (kind, y, placement) => {
      const { container, onMove, select, detail } = setup();
      const row = container.querySelectorAll(
        kind === "Story" ? ".story-choice" : ".task-line",
      )[kind === "Story" ? 3 : 2] as HTMLElement;
      vi.spyOn(row, "getBoundingClientRect").mockReturnValue({
        top: 100,
        height: 50,
      } as DOMRect);
      const handle = screen.getByRole("button", {
        name: `${kind} Aを並べ替え`,
      });
      const operation = drag(handle, row, y);
      expect(row.dataset.drop).toBe(placement);
      operation.drop();
      await waitFor(() =>
        expect(onMove).toHaveBeenCalledWith(
          kind === "Story" ? "Story A" : null,
          kind === "Story" ? "Story C" : "Task A",
          kind === "Story" ? placement : "Task C",
          ...(kind === "Story" ? [] : [placement]),
        ),
      );
      expect(select).not.toHaveBeenCalled();
      expect(detail).not.toHaveBeenCalled();
      expect(row.dataset.drop).toBeUndefined();
    },
  );
  it("REQ-045-S03 Taks、外部と取消は保存せず、境界を越えない", async () => {
    const { container, onMove } = setup();
    expect(screen.queryByRole("button", { name: "Taksを並べ替え" })).toBeNull();
    const rows = container.querySelectorAll<HTMLElement>(".story-choice");
    const handle = screen.getByRole("button", { name: "Story Aを並べ替え" });
    fireEvent.drop(rows[2]);
    const operation = drag(handle, rows[0], 0);
    operation.drop();
    expect(onMove).not.toHaveBeenCalled();
    drag(handle, rows[3], 0);
    fireEvent.keyDown(handle, { key: "Escape" });
    fireEvent.drop(rows[3], { dataTransfer: operation.transfer });
    expect(onMove).not.toHaveBeenCalled();
    expect(rows[3].dataset.drop).toBeUndefined();
    fireEvent.keyDown(handle, { key: "ArrowUp" });
    fireEvent.keyDown(
      screen.getByRole("button", { name: "Story Cを並べ替え" }),
      { key: "ArrowDown" },
    );
    expect(onMove).not.toHaveBeenCalled();
  });
  it("REQ-045-S04/S05/S06 キー、保存中と失敗後の再操作でも下書きを保持する", async () => {
    let finish: (ok: boolean) => void = () => {};
    const onMove = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          finish = resolve;
        }),
    );
    const { select, detail } = setup(null, onMove);
    fireEvent.click(screen.getByRole("button", { name: "Taskを追加" }));
    const input = screen.getByRole("textbox", { name: "名前" });
    fireEvent.change(input, { target: { value: "保持する下書き" } });
    const handle = screen.getByRole("button", { name: "Task Bを並べ替え" });
    handle.focus();
    fireEvent.keyDown(handle, { key: "ArrowUp" });
    expect(onMove).toHaveBeenCalledWith(null, "Task B", "Task A", "before");
    expect(handle).toHaveProperty("disabled", true);
    handle.blur();
    fireEvent.keyDown(handle, { key: "ArrowDown" });
    expect(onMove).toHaveBeenCalledTimes(1);
    finish(false);
    await waitFor(() => expect(handle).toHaveProperty("disabled", false));
    expect(document.activeElement).toBe(handle);
    expect(input).toHaveProperty("value", "保持する下書き");
    expect(select).not.toHaveBeenCalled();
    expect(detail).not.toHaveBeenCalled();
    fireEvent.keyDown(handle, { key: "ArrowDown" });
    expect(onMove).toHaveBeenLastCalledWith(null, "Task B", "Task C", "after");
    finish(true);
  });
  it("REQ-045-S03 別所属への切替で古いドラッグは使えない", () => {
    const { container, rerender, onMove } = setup();
    const handle = screen.getByRole("button", { name: "Task Aを並べ替え" });
    fireEvent.dragStart(handle, {
      dataTransfer: { setData: vi.fn(), setDragImage: vi.fn() },
    });
    rerender(
      <EventDetails
        event={event}
        selectedStoryId="Story A"
        today="2026-11-15"
        prediction={null}
        onMoveTask={onMove}
      />,
    );
    const row = container.querySelector(".task-line");
    if (!row) throw new Error("Task行がない");
    fireEvent.drop(row);
    expect(onMove).not.toHaveBeenCalled();
  });
});

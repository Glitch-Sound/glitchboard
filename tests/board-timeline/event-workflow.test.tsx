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
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Event } from "../../packages/shared/src/domain/index.js";
import { EventDetails } from "../../packages/webview/src/widgets/event-details/ui/EventDetails.js";

const event: Event = {
  id: "event",
  name: "Release",
  due: "2026-11-20",
  stories: [
    { id: "first", name: "First", tasks: [{ id: "t1", name: "First task" }] },
    {
      id: "second",
      name: "Second",
      tasks: [{ id: "t2", name: "Second task" }],
    },
  ],
};
const base = { today: "2026-11-14", prediction: null };
afterEach(cleanup);
function inputTask(name: string) {
  fireEvent.click(screen.getByRole("button", { name: "Taskを追加" }));
  const input = within(
    screen.getByRole("region", { name: "Task一覧" }),
  ).getByRole("textbox", { name: "名前" });
  fireEvent.change(input, { target: { value: name } });
  return input;
}

describe("Eventの作業フロー", () => {
  it("REQ-033-S04 Storyがなくても追加でき、空白と取消では送信しない", () => {
    const onAddEventTask = vi.fn();
    render(
      <EventDetails
        {...base}
        event={{ ...event, stories: [] }}
        onAddEventTask={onAddEventTask}
      />,
    );
    let input = inputTask("  ");
    fireEvent.submit(formFor(input));
    expect(onAddEventTask).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Escape" });
    input = inputTask("取消する");
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Taskを追加" }));
    expect(screen.getByRole("textbox", { name: "名前" })).toHaveProperty(
      "value",
      "",
    );
    expect(onAddEventTask).not.toHaveBeenCalled();
  });

  it("REQ-034-S01 同じEvent更新で選択と追加入力が戻らない", () => {
    const props = { ...base, event, onAddTask: vi.fn() };
    const view = render(<EventDetails {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /^Second/ }));
    inputTask("下書き");
    view.rerender(<EventDetails {...props} event={structuredClone(event)} />);
    expect(
      screen
        .getByRole("button", { name: /^Second/ })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.getByRole("textbox", { name: "名前" })).toHaveProperty(
      "value",
      "下書き",
    );
  });

  it("REQ-034-S02 選択Story消失とEvent切替は未保存入力を取り消す", () => {
    const props = { ...base, event, onAddTask: vi.fn(), onAddStory: vi.fn() };
    const view = render(<EventDetails {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /^Second/ }));
    inputTask("古い入力");
    view.rerender(
      <EventDetails
        {...props}
        event={{ ...event, stories: event.stories.slice(0, 1) }}
      />,
    );
    expect(screen.queryByRole("textbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Storyを追加" }));
    fireEvent.change(screen.getByRole("textbox", { name: "名前" }), {
      target: { value: "古いStory" },
    });
    view.rerender(
      <EventDetails {...props} event={{ ...event, id: "other" }} />,
    );
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("REQ-034-S03 直接追加の失敗後に同じ入力を再送し成功後だけ閉じる", async () => {
    const onAddEventTask = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    render(
      <EventDetails
        {...base}
        event={{ ...event, stories: [] }}
        onAddEventTask={onAddEventTask}
      />,
    );
    const input = inputTask(" 調査 ");
    fireEvent.submit(formFor(input));
    await waitFor(() => expect(onAddEventTask).toHaveBeenCalledTimes(1));
    expect(input).toHaveProperty("value", " 調査 ");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "追加" })).toHaveProperty(
        "disabled",
        false,
      ),
    );
    fireEvent.submit(formFor(input));
    await waitFor(() => expect(screen.queryByRole("textbox")).toBeNull());
    expect(onAddEventTask.mock.calls).toEqual([
      ["event", "調査"],
      ["event", "調査"],
    ]);
  });

  it("REQ-034-S04 重複送信を防ぎ、取消後の古い応答で新しい入力を消さない", async () => {
    let resolve!: (ok: boolean) => void;
    const onAddTask = vi.fn(
      () =>
        new Promise<boolean>((done) => {
          resolve = done;
        }),
    );
    render(<EventDetails {...base} event={event} onAddTask={onAddTask} />);
    const input = inputTask("送信する");
    fireEvent.submit(formFor(input));
    fireEvent.submit(formFor(input));
    expect(onAddTask).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(input, { key: "Escape" });
    inputTask("新しい下書き");
    await act(async () => resolve(true));
    expect(screen.getByRole("textbox", { name: "名前" })).toHaveProperty(
      "value",
      "新しい下書き",
    );
  });
});

function formFor(element: HTMLElement): HTMLFormElement {
  const form = element.closest("form");
  if (!form) throw new Error("追加フォームが見つからない");
  return form;
}

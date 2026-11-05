// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Event } from "../../packages/shared/src/domain/index.js";
import { EventDetails } from "../../packages/webview/src/widgets/event-details/ui/EventDetails.js";

const event = {
  id: "event",
  name: "Release",
  due: "2026-11-20",
  stories: [
    {
      id: "story",
      name: "認証フロー刷新",
      tasks: [{ id: "task", name: "既存Task", points: 3 }],
    },
  ],
} as Event;

afterEach(cleanup);

describe("TASK追加欄", () => {
  it("見出しの直下で入力して追加できる", async () => {
    const onAddTask = vi.fn(async () => true);
    const { container } = render(
      createElement(EventDetails, {
        event,
        today: "2026-11-06",
        prediction: null,
        onAddTask,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Taskを追加" }));
    const taskSection = screen.getByRole("region", { name: "Task一覧" });
    const form = container.querySelector(".task-add-form");
    expect(form?.previousElementSibling?.tagName).toBe("H3");
    expect(form?.nextElementSibling?.classList.contains("task-line")).toBe(
      true,
    );
    expect(within(taskSection).queryByRole("button", { name: "?" })).toBeNull();
    const name = screen.getByRole("textbox", { name: "名前" });
    expect(name).toHaveProperty(
      "placeholder",
      "Task名 — Enterで追加 / Escで取消",
    );
    fireEvent.change(name, { target: { value: " 新しいTask " } });
    if (!form) throw new Error("Task追加フォームが見つからない");
    fireEvent.submit(form);
    await waitFor(() =>
      expect(onAddTask).toHaveBeenCalledWith("story", "新しいTask"),
    );
    await waitFor(() =>
      expect(container.querySelector(".task-add-form")).toBeNull(),
    );
  });

  it("Escで入力を取り消す", () => {
    const onAddTask = vi.fn();
    render(
      createElement(EventDetails, {
        event,
        today: "2026-11-06",
        prediction: null,
        onAddTask,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Taskを追加" }));
    fireEvent.keyDown(screen.getByRole("textbox", { name: "名前" }), {
      key: "Escape",
    });
    expect(screen.queryByRole("textbox", { name: "名前" })).toBeNull();
    expect(onAddTask).not.toHaveBeenCalled();
  });
});

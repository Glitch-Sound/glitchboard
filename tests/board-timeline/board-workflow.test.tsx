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
import type { Snapshot } from "../../packages/shared/src/domain/messages.js";

const postMessage = vi.hoisted(() => vi.fn());
vi.mock("../../packages/webview/src/app/bridge.js", () => ({
  localBridge: () => ({ postMessage }),
}));

import { BoardApp } from "../../packages/webview/src/app/board.js";

const projects = [0, 1].map((i) => ({
  id: `11111111-1111-4111-8111-11111111111${i}`,
  name: `Project ${i}`,
  color: "#123456",
  events: [
    {
      id: `22222222-2222-4222-8222-22222222222${i}`,
      name: `Event ${i}`,
      due: "2026-11-20",
      stories: [
        {
          id: `33333333-3333-4333-8333-33333333333${i}`,
          name: "Story",
          tasks: [
            {
              id: `44444444-4444-4444-8444-44444444444${i}`,
              name: `Task ${i}`,
            },
          ],
        },
      ],
    },
  ],
}));
const snapshot: Snapshot = {
  version: 1,
  projects,
  selectedEventId: projects[1].events[0].id,
  error: null,
  settings: { workdays_off: [], public_holidays: false },
  projectEntries: [],
};
function emit(payload: Snapshot) {
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", { data: { type: "snapshot", payload } }),
    );
  });
}
afterEach(() => {
  cleanup();
  postMessage.mockClear();
});

describe("ボードの入口", () => {
  it("REQ-035-S01 名前からProject、Event、Task詳細へ直接到達し、チェックとStory選択は独立する", () => {
    render(<BoardApp />);
    emit(snapshot);
    for (const name of ["Project 1", "Event 1", "Task 1"]) {
      fireEvent.click(
        (name.startsWith("Event")
          ? within(screen.getByRole("region", { name: "Event詳細" }))
          : screen
        ).getByRole("button", { name }),
      );
      expect(
        within(screen.getByRole("dialog", { name: "詳細パネル" })).getByRole(
          "heading",
          { name },
        ),
      ).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "詳細を閉じる" }));
    }
    fireEvent.click(screen.getByRole("button", { name: /^Story0/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Task 1の完了" }));
    expect(screen.queryByRole("dialog", { name: "詳細パネル" })).toBeNull();
    expect(
      postMessage.mock.calls
        .map(([m]) => m)
        .filter((m) => m.type === "setTaskDone"),
    ).toEqual([
      {
        type: "setTaskDone",
        taskId: projects[1].events[0].stories[0].tasks[0].id,
        done: true,
      },
    ]);
  });

  it("REQ-037-S01 ボードのEvent追加は現在のProjectを選択して保存する", () => {
    render(<BoardApp />);
    emit(snapshot);
    fireEvent.click(screen.getByRole("button", { name: "Eventを追加" }));
    expect(screen.getByRole("combobox", { name: "Project" })).toHaveProperty(
      "value",
      projects[1].id,
    );
    fireEvent.change(screen.getByLabelText("名前"), {
      target: { value: "Added" },
    });
    fireEvent.change(screen.getByLabelText("期限"), {
      target: { value: "2026-11-22" },
    });
    fireEvent.submit(formFor(screen.getByLabelText("名前")));
    expect(
      postMessage.mock.calls.map(([m]) => m).find((m) => m.type === "addEvent"),
    ).toMatchObject({
      type: "addEvent",
      projectId: projects[1].id,
      name: "Added",
      due: "2026-11-22",
    });
  });

  it("REQ-037-S02 空の画面で次の追加を案内する", () => {
    render(<BoardApp />);
    emit({ ...snapshot, projects: [], selectedEventId: null });
    expect(screen.getByText("Project を追加して始めましょう")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Eventを追加" })).toBeNull();
    emit({
      ...snapshot,
      projects: [{ ...projects[0], events: [] }],
      selectedEventId: null,
    });
    expect(screen.getByText("Event を追加しましょう")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Eventを追加" }));
    expect(screen.getByRole("combobox", { name: "Project" })).toHaveProperty(
      "value",
      projects[0].id,
    );
  });
});

function formFor(element: HTMLElement): HTMLFormElement {
  const form = element.closest("form");
  if (!form) throw new Error("追加フォームが見つからない");
  return form;
}

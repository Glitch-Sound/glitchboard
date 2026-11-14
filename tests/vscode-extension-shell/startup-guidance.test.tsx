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
import { EventsApp } from "../../packages/webview/src/app/events.js";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const base = {
  version: 1,
  projects: [
    {
      id: id(1),
      name: "Alpha",
      sourceFile: "A.yaml",
      color: "#123456",
      events: [
        {
          id: id(2),
          name: "Release",
          due: "2099-01-01",
          tasks: [],
          stories: [],
        },
      ],
    },
  ],
  selectedEventId: id(2),
  selectedProjectFile: "A.yaml",
  error: null,
  settings: { workdays_off: [], public_holidays: false },
  projectEntries: [],
  manageAvailability: { status: "ready" },
};
function emit(data: unknown) {
  act(() => window.dispatchEvent(new MessageEvent("message", { data })));
}
afterEach(() => {
  cleanup();
  postMessage.mockClear();
});
it.each(["unset", "missing"])(
  "REQ-029-S12 %s の設定案内は両アプリ同時表示でも左に1組だけ",
  (state) => {
    const board = render(<BoardApp />);
    const events = render(<EventsApp />);
    emit(
      state === "unset"
        ? { type: "unconfigured" }
        : {
            type: "snapshot",
            payload: {
              ...base,
              projects: [],
              selectedEventId: null,
              manageAvailability: {
                status: "missing",
                path: "/missing/manage.yaml",
              },
              error: "not found",
            },
          },
    );
    expect(
      within(events.container).getAllByRole("region", {
        name: "manage.yamlの設定",
      }),
    ).toHaveLength(1);
    expect(
      within(board.container).queryByRole("region", {
        name: "manage.yamlの設定",
      }),
    ).toBeNull();
    expect(
      screen.getAllByRole("button", { name: "manage.yamlを選ぶ" }),
    ).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "新しく作る" })).toHaveLength(
      1,
    );
    emit({ type: "snapshot", payload: base });
    expect(
      screen.queryByRole("region", { name: "manage.yamlの設定" }),
    ).toBeNull();
  },
);
it.each(["unset", "missing", "switchMissing"])(
  "REQ-029-S11 REQ-029-S03 %s は既存メインの表示と追加下書きを保持する",
  (state) => {
    const board = render(<BoardApp />);
    render(<EventsApp />);
    emit({ type: "snapshot", payload: base });
    fireEvent.click(
      within(board.container).getByRole("button", { name: "Taskを追加" }),
    );
    const input = within(board.container).getByRole("textbox", {
      name: "名前",
    });
    fireEvent.change(input, { target: { value: "Keep draft" } });
    fireEvent.click(
      within(board.container).getByRole("button", { name: "Releaseの詳細" }),
    );
    const detail = within(
      within(board.container).getByRole("dialog", { name: "詳細パネル" }),
    );
    fireEvent.click(detail.getByRole("button", { name: "編集" }));
    fireEvent.change(detail.getByLabelText("名前"), {
      target: { value: "Keep detail draft" },
    });
    if (state === "unset") emit({ type: "unconfigured" });
    else {
      if (state === "switchMissing")
        emit({
          type: "snapshot",
          payload: {
            ...base,
            version: 0,
            projects: [],
            selectedEventId: null,
            manageAvailability: undefined,
          },
        });
      emit({
        type: "snapshot",
        payload: {
          ...base,
          projects: state === "missing" ? base.projects : [],
          selectedEventId: state === "missing" ? id(2) : null,
          manageAvailability: {
            status: "missing",
            path: "/missing/manage.yaml",
          },
          error: "not found",
        },
      });
    }
    expect(
      within(
        within(board.container).getByRole("region", { name: "Task一覧" }),
      ).getByRole("textbox", { name: "名前" }),
    ).toHaveProperty("value", "Keep draft");
    expect(detail.getByLabelText("名前")).toHaveProperty(
      "value",
      "Keep detail draft",
    );
    expect(
      within(board.container).getByRole("region", { name: "Event詳細" }),
    ).toBeTruthy();
    expect(
      within(board.container).queryByRole("region", {
        name: "manage.yamlの設定",
      }),
    ).toBeNull();
    if (state !== "unset") {
      emit({ type: "unconfigured" });
      expect(
        within(board.container).queryByText("/missing/manage.yaml"),
      ).toBeNull();
      expect(within(board.container).queryByRole("alert")).toBeNull();
      expect(detail.getByLabelText("名前")).toHaveProperty(
        "value",
        "Keep detail draft",
      );
    }
  },
);

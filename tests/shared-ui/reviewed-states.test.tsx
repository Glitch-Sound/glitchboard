// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("../../packages/webview/src/app/bridge.js", () => ({
  localBridge: () => ({ postMessage: vi.fn() }),
}));

import { BoardApp } from "../../packages/webview/src/app/board.js";
import { EventsApp } from "../../packages/webview/src/app/events.js";

const id = "11111111-1111-4111-8111-111111111111";
const base = {
  version: 1,
  projects: [],
  projectEntries: [],
  selectedEventId: null,
  error: null,
  manageAvailability: { status: "ready" },
  settings: { workdays_off: [], public_holidays: false },
};
function emit(payload: unknown) {
  act(() =>
    window.dispatchEvent(
      new MessageEvent("message", { data: { type: "snapshot", payload } }),
    ),
  );
}
afterEach(cleanup);
it.each([
  ["REQ-043-S01", [], [], "Project を追加して始めましょう"],
  [
    "REQ-043-S02",
    [],
    [{ file: "A.yaml", name: "Alpha", load: false }],
    "Project の読み込みを選びましょう",
  ],
])(
  "%s 左右の空状態で理由と次の入口を案内する",
  (_scenario, projects, projectEntries, title) => {
    const board = render(<BoardApp />),
      events = render(<EventsApp />);
    emit({ ...base, projects, projectEntries });
    expect(
      within(board.container).getByRole("heading", { name: title as string }),
    ).toBeTruthy();
    expect(
      within(events.container).getByRole("heading", { name: title as string }),
    ).toBeTruthy();
    if (projectEntries.length)
      expect(screen.queryByText("Project を追加して始めましょう")).toBeNull();
  },
);
it("REQ-043-S03 読込済み Project に Event がなければ追加の入口を案内する", () => {
  const board = render(<BoardApp />),
    events = render(<EventsApp />);
  emit({
    ...base,
    projects: [{ id, name: "Alpha", color: "#123456", events: [] }],
    projectEntries: [{ file: "A.yaml", name: "Alpha", load: true }],
  });
  expect(
    within(board.container).getByRole("heading", {
      name: "Event を追加しましょう",
    }),
  ).toBeTruthy();
  expect(
    within(events.container).getByRole("heading", {
      name: "表示できる Event がありません",
    }),
  ).toBeTruthy();
  expect(
    within(events.container).getByText(
      "Event ＋ で追加するか、抽出条件を確認してください。",
    ),
  ).toBeTruthy();
});
it("REQ-043-S04 抽出条件で完了 Event が隠れても Project 不在と案内しない", () => {
  render(<EventsApp />);
  emit({
    ...base,
    projects: [
      {
        id,
        name: "Alpha",
        color: "#123456",
        events: [
          {
            id: "22222222-2222-4222-8222-222222222222",
            name: "Done",
            due: "2026-11-14",
            stories: [],
            tasks: [
              {
                id: "33333333-3333-4333-8333-333333333333",
                name: "Done task",
                doneAt: "2026-11-13",
              },
            ],
          },
        ],
      },
    ],
    projectEntries: [{ file: "A.yaml", name: "Alpha", load: true }],
  });
  expect(
    screen.getByRole("heading", { name: "表示できる Event がありません" }),
  ).toBeTruthy();
  expect(screen.queryByText("Project を追加して始めましょう")).toBeNull();
});
it("REQ-014-S03 左右のエラーは原文と alert を保ち共通の警告アイコンを持つ", () => {
  render(<BoardApp />);
  render(<EventsApp />);
  const message = `${"/very/long/path/".repeat(20)} 読み込めません`;
  emit({ ...base, error: message });
  expect(screen.getAllByRole("alert")).toHaveLength(2);
  for (const alert of screen.getAllByRole("alert")) {
    expect(alert.textContent).toBe(message);
    expect(alert.className).toBe("operation-error");
    expect(alert.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  }
});

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
import { Timeline } from "../../packages/webview/src/widgets/timeline/ui/Timeline.js";

const postMessage = vi.hoisted(() => vi.fn());
vi.mock("../../packages/webview/src/app/bridge.js", () => ({
  localBridge: () => ({ postMessage }),
}));

import { BoardApp } from "../../packages/webview/src/app/board.js";
import { EventsApp } from "../../packages/webview/src/app/events.js";

const projects = ["Alpha", "Beta", "Gamma"].map((name, index) => ({
  id: `11111111-1111-4111-8111-11111111111${index}`,
  sourceFile: `${name}.yaml`,
  name,
  color: "#123456",
  events: [
    {
      id: `22222222-2222-4222-8222-22222222222${index}`,
      name: `${name} Event`,
      due: "2026-11-17",
      stories: [],
      tasks: [
        {
          id: `33333333-3333-4333-8333-33333333333${index}`,
          name: `${name} Task`,
          points: 3 as const,
        },
      ],
    },
  ],
}));
afterEach(() => {
  cleanup();
  postMessage.mockClear();
  vi.useRealTimers();
});
it("REQ-047-S01 アーカイブ行を除いた前後へキーボードで並べ替える", async () => {
  const onMove = vi.fn(async () => true);
  const view = render(
    <Timeline
      projects={projects.map((p, i) => ({ ...p, archived: i === 1 }))}
      days={["2026-11-17"]}
      today="2026-11-16"
      period="week"
      selectedEventId={null}
      onSelect={vi.fn()}
      onMoveProject={onMove}
    />,
  );
  expect(
    Array.from(
      view.container.querySelectorAll(".project-name"),
      (n) => n.textContent,
    ),
  ).toEqual(["Alpha", "Gamma"]);
  expect(view.container.querySelectorAll(".event-marker")).toHaveLength(2);
  fireEvent.keyDown(screen.getByRole("button", { name: "Gammaを並べ替え" }), {
    key: "ArrowUp",
  });
  expect(onMove).toHaveBeenCalledWith(projects[2].id, projects[0].id, "before");
  await act(async () => {});
});
it("REQ-047-S01/S05 保存結果でPROJECT行だけを隠し、全件でもEVENT、選択とヘッダーの計算を維持する", () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-16T12:00:00Z"));
  const board = render(<BoardApp />);
  const sidebar = render(<EventsApp />);
  const snapshot = {
    version: 1,
    selectedEventId: projects[1].events[0].id,
    selectedProjectFile: "Beta.yaml",
    error: null,
    settings: { workdays_off: [], public_holidays: false },
    projects,
    projectEntries: projects.map((p) => ({
      file: p.sourceFile,
      load: true,
      name: p.name,
    })),
  };
  const emit = (value: unknown) =>
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "snapshot", payload: value },
        }),
      );
    });
  emit(snapshot);
  fireEvent.click(
    within(board.container).getByRole("button", { name: "Taskを追加" }),
  );
  const draft = within(board.container).getByRole("textbox", { name: "名前" });
  fireEvent.change(draft, { target: { value: "追加前の下書き" } });
  const header = board.container.querySelector(".board-header")?.textContent;
  const summary = within(board.container).getByRole("region", {
    name: "Event詳細",
  }).textContent;
  emit({
    ...snapshot,
    version: 2,
    projects: projects.map((p) => ({ ...p, archived: true })),
  });
  expect(board.container.querySelectorAll(".project-row")).toHaveLength(0);
  expect(draft).toHaveProperty("value", "追加前の下書き");
  expect(draft.isConnected).toBe(true);
  expect(board.container.querySelectorAll(".event-marker")).toHaveLength(0);
  expect(
    within(board.container).getByRole("button", { name: "Projectを追加" }),
  ).toBeTruthy();
  expect(
    within(board.container).getByRole("img", { name: "日別必要ペース" }),
  ).toBeTruthy();
  expect(board.container.querySelector(".board-header")?.textContent).toBe(
    header,
  );
  expect(
    within(board.container).getByRole("region", { name: "Event詳細" })
      .textContent,
  ).toBe(summary);
  expect(
    within(board.container).getByRole("checkbox", { name: "Beta Taskの完了" }),
  ).toBeTruthy();
  expect(
    Array.from(
      sidebar.container.querySelectorAll(".event-row-name"),
      (n) => n.textContent,
    ),
  ).toEqual(["Alpha Event", "Beta Event", "Gamma Event"]);
});

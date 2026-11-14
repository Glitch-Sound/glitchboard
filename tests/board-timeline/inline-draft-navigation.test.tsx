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
  localBridge: () => ({ postMessage }),
}));

import { BoardApp } from "../../packages/webview/src/app/board.js";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const snapshot = {
  version: 1,
  selectedEventId: id(2),
  selectedProjectFile: "A.yaml",
  error: null,
  settings: { workdays_off: [], public_holidays: false },
  projectEntries: [],
  projects: [
    {
      id: id(1),
      sourceFile: "A.yaml",
      name: "Alpha",
      color: "#123456",
      events: [
        {
          id: id(2),
          name: "First",
          due: "2099-11-20",
          tasks: [{ id: id(3), name: "Direct" }],
          stories: [
            {
              id: id(4),
              name: "Group",
              tasks: [{ id: id(5), name: "Grouped" }],
            },
            { id: id(6), name: "Other", tasks: [] },
          ],
        },
        { id: id(7), name: "Next", due: "2099-11-21", tasks: [], stories: [] },
      ],
    },
  ],
};
const tasks = () => within(screen.getByRole("region", { name: "Task一覧" }));
const group = () => screen.getByRole("button", { name: /^Group0/ });
function start() {
  render(<BoardApp />);
  act(() =>
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "snapshot", payload: snapshot },
      }),
    ),
  );
  fireEvent.click(group());
  fireEvent.click(tasks().getByRole("button", { name: "Taskを追加" }));
  fireEvent.change(tasks().getByLabelText("名前"), {
    target: { value: "Draft in Group" },
  });
  postMessage.mockClear();
}
function sidebar() {
  act(() =>
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: "navigateRecord",
          payload: {
            kind: "event",
            id: id(7),
            projectFile: "A.yaml",
            openDetail: true,
          },
        },
      }),
    ),
  );
}
const routes = {
  name: () => fireEvent.click(screen.getByRole("button", { name: /^Taks0/ })),
  space: () =>
    fireEvent.click(screen.getByRole("button", { name: "Taksを選択" })),
  otherName: () =>
    fireEvent.click(screen.getByRole("button", { name: /^Other0/ })),
  otherSpace: () =>
    fireEvent.click(screen.getByRole("button", { name: "Otherを選択" })),
  detail: () =>
    fireEvent.click(screen.getByRole("button", { name: "Otherの詳細" })),
  project: () => fireEvent.click(screen.getByRole("button", { name: "Alpha" })),
  event: () => fireEvent.click(screen.getByRole("button", { name: "First" })),
  sidebar,
};
const additions = () =>
  postMessage.mock.calls
    .map(([m]) => m)
    .filter((m) => ["addTask", "addEventTask", "addStory"].includes(m.type));
async function result(ok: boolean) {
  const request = additions().at(-1);
  await act(async () =>
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: "operationResult",
          requestId: request.requestId,
          payload: { ok, error: ok ? undefined : "Failure" },
        },
      }),
    ),
  );
}
afterEach(() => {
  cleanup();
  postMessage.mockReset();
});
describe("追加の下書きと選択の保護", () => {
  it.each(Object.keys(routes) as (keyof typeof routes)[])(
    "REQ-034-S05 %s の移動取消は元の入力と追加先を保つ",
    (route) => {
      start();
      routes[route]();
      const prompt = within(
        screen.getByRole("alertdialog", { name: "未保存の追加入力" }),
      );
      expect(group().getAttribute("aria-pressed")).toBe("true");
      expect(tasks().getByLabelText("名前")).toHaveProperty(
        "value",
        "Draft in Group",
      );
      fireEvent.click(prompt.getByRole("button", { name: "キャンセル" }));
      fireEvent.submit(
        tasks().getByLabelText("名前").closest("form") as HTMLFormElement,
      );
      expect(additions()).toEqual([
        {
          type: "addTask",
          storyId: id(4),
          projectFile: "A.yaml",
          name: "Draft in Group",
          requestId: expect.any(Number),
        },
      ]);
    },
  );
  it.each(["name", "space", "detail", "sidebar"] as const)(
    "REQ-034-S06 詳細切替 %s の取消ではTask追加の下書きも消えない",
    (route) => {
      start();
      fireEvent.click(screen.getByRole("button", { name: "Groupの詳細" }));
      const panel = within(screen.getByRole("dialog", { name: "詳細パネル" }));
      fireEvent.click(panel.getByRole("button", { name: "編集" }));
      fireEvent.change(panel.getByLabelText("名前"), {
        target: { value: "Edited Group" },
      });
      postMessage.mockClear();
      routes[route]();
      expect(
        screen.queryByRole("alertdialog", { name: "未保存の追加入力" }),
      ).toBeNull();
      fireEvent.click(
        within(
          screen.getByRole("alertdialog", { name: "未保存の編集" }),
        ).getByRole("button", { name: "キャンセル" }),
      );
      expect(panel.getByLabelText("名前")).toHaveProperty(
        "value",
        "Edited Group",
      );
      expect(tasks().getByLabelText("名前")).toHaveProperty(
        "value",
        "Draft in Group",
      );
      expect(group().getAttribute("aria-pressed")).toBe("true");
      expect(postMessage.mock.calls).toEqual([]);
    },
  );
  it("REQ-034-S07 保存失敗と再送は同じStoryを使い、成功するまで移動しない", async () => {
    start();
    routes.space();
    fireEvent.click(screen.getByRole("button", { name: "追加して進む" }));
    fireEvent.click(screen.getByRole("button", { name: "追加中…" }));
    expect(additions()).toHaveLength(1);
    expect(additions()[0]).toMatchObject({ type: "addTask", storyId: id(4) });
    await result(false);
    expect(tasks().getByLabelText("名前")).toHaveProperty(
      "value",
      "Draft in Group",
    );
    routes.otherName();
    fireEvent.click(screen.getByRole("button", { name: "追加して進む" }));
    await result(true);
    expect(additions().map(({ requestId, ...m }) => m)).toEqual(
      Array(2).fill({
        type: "addTask",
        storyId: id(4),
        projectFile: "A.yaml",
        name: "Draft in Group",
      }),
    );
    expect(
      screen
        .getByRole("button", { name: /^Taks0/ })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(tasks().queryByRole("textbox")).toBeNull();
  });
  it("REQ-034-S08 明示的に破棄するまでは保持し、同じ追加先のTask選択は入力を残す", () => {
    start();
    fireEvent.click(group());
    fireEvent.click(screen.getByRole("button", { name: "Groupを選択" }));
    expect(tasks().getByLabelText("名前")).toHaveProperty(
      "value",
      "Draft in Group",
    );
    fireEvent.click(screen.getByRole("button", { name: "Groupedを選択" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(tasks().getByLabelText("名前")).toHaveProperty(
      "value",
      "Draft in Group",
    );
    routes.space();
    fireEvent.click(screen.getByRole("button", { name: "破棄して進む" }));
    expect(tasks().queryByRole("textbox")).toBeNull();
    expect(additions()).toEqual([]);
    expect(
      screen
        .getByRole("button", { name: /^Taks0/ })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });
  it("REQ-034-S05 Taksの下書きも元Eventへ固定し、Story詳細の選択で転用しない", async () => {
    start();
    fireEvent.keyDown(tasks().getByLabelText("名前"), { key: "Escape" });
    routes.space();
    fireEvent.click(tasks().getByRole("button", { name: "Taskを追加" }));
    fireEvent.change(tasks().getByLabelText("名前"), {
      target: { value: "Direct draft" },
    });
    postMessage.mockClear();
    routes.detail();
    fireEvent.click(screen.getByRole("button", { name: "追加して進む" }));
    expect(additions()[0]).toMatchObject({
      type: "addEventTask",
      eventId: id(2),
      projectFile: "A.yaml",
      name: "Direct draft",
    });
    await result(true);
    expect(
      within(screen.getByRole("dialog", { name: "詳細パネル" })).getByText(
        "STORY : Other",
      ),
    ).toBeTruthy();
  });
  it("REQ-034-S07 TaskとStoryの片方だけ成功しても、再送で成功済みを二重追加しない", async () => {
    start();
    fireEvent.click(screen.getByRole("button", { name: "Storyを追加" }));
    fireEvent.change(
      within(screen.getByRole("region", { name: "Story一覧" })).getByLabelText(
        "名前",
      ),
      { target: { value: "New Story" } },
    );
    sidebar();
    fireEvent.click(screen.getByRole("button", { name: "追加して進む" }));
    await result(true);
    expect(additions().map((m) => m.type)).toEqual(["addTask", "addStory"]);
    await result(false);
    expect(tasks().queryByRole("textbox")).toBeNull();
    expect(
      within(screen.getByRole("region", { name: "Story一覧" })).getByLabelText(
        "名前",
      ),
    ).toHaveProperty("value", "New Story");
    fireEvent.click(screen.getByRole("button", { name: "追加して進む" }));
    await result(true);
    expect(additions().map(({ requestId, ...m }) => m)).toEqual([
      {
        type: "addTask",
        storyId: id(4),
        projectFile: "A.yaml",
        name: "Draft in Group",
      },
      ...Array(2).fill({
        type: "addStory",
        eventId: id(2),
        projectFile: "A.yaml",
        name: "New Story",
      }),
    ]);
    expect(
      within(screen.getByRole("dialog", { name: "詳細パネル" })).getByText(
        "EVENT : Next",
      ),
    ).toBeTruthy();
  });
  it("REQ-034-S07 通常追加の保存中も追加先を変えず、完了後に改めて移動できる", async () => {
    start();
    fireEvent.submit(
      tasks().getByLabelText("名前").closest("form") as HTMLFormElement,
    );
    routes.name();
    expect(group().getAttribute("aria-pressed")).toBe("true");
    expect(additions()).toHaveLength(1);
    await result(true);
    routes.name();
    expect(
      screen
        .getByRole("button", { name: /^Taks0/ })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });
});

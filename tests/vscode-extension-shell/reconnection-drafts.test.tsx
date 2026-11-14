import * as fs from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { populateGlobal } from "vitest/environments";
import { activate } from "../../packages/extension/src/extension.js";
import { parseProjectYaml } from "../../packages/extension/src/storage/project.js";

import { host, latest, resetHost, webview } from "./extension-harness.js";

vi.mock("vscode", async () =>
  (await import("./extension-harness.js")).vscodeMock(),
);
vi.mock("node:fs/promises", async (original) => {
  const actual = await original<typeof import("node:fs/promises")>();
  return { ...actual, writeFile: vi.fn(actual.writeFile) };
});
vi.mock("../../packages/webview/src/app/bridge.js", () => ({
  localBridge: () => ({
    postMessage: (message: unknown) => {
      void host.receivers.board?.(message);
    },
  }),
}));
const { JSDOM } = createRequire(import.meta.url)("jsdom") as {
  JSDOM: new (html: string, options: { url: string }) => { window: Window };
};
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost",
});
populateGlobal(globalThis, dom.window, { bindFunctions: true });
const { act, cleanup, fireEvent, render, screen, within } = await import(
  "@testing-library/react"
);
const { BoardApp } = await import("../../packages/webview/src/app/board.js");
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
let root: string;
let a: string;
let b: string;
let subscriptions: { dispose(): void }[];
const payload = (name: string) => ({
  id: id(1),
  name,
  color: "#123456",
  events: [1, 2].map((n) => ({
    id: id(n + 1),
    name: `${name} Event ${n}`,
    due: "2099-01-01",
    tasks: [],
    stories: [1, 2].map((k) => ({
      id: id(n * 10 + k),
      name: `Story ${k}`,
      tasks: [],
    })),
  })),
});
async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}
async function choose(path: string, type = "chooseManage") {
  if (type === "chooseManage")
    host.openDialog.mockResolvedValueOnce([{ fsPath: path }]);
  else host.saveDialog.mockResolvedValueOnce({ fsPath: path });
  await host.receivers.events?.({ type, requestId: 90 });
}
async function unset() {
  const start = host.messages.board.length;
  host.path = "";
  act(() => host.config?.({ affectsConfiguration: () => true }));
  await vi.waitFor(() =>
    expect(
      host.messages.board
        .slice(start)
        .some((message) => message.type === "unconfigured"),
    ).toBe(true),
  );
  await flush();
}
function taskDraft() {
  fireEvent.click(screen.getByRole("button", { name: "Taskを追加" }));
  fireEvent.change(
    within(screen.getByRole("region", { name: "Task一覧" })).getByRole(
      "textbox",
      { name: "名前" },
    ),
    { target: { value: "Source draft" } },
  );
}
function assertTaskDraft() {
  expect(
    within(screen.getByRole("region", { name: "Task一覧" })).getByRole(
      "textbox",
      { name: "名前" },
    ),
  ).toHaveProperty("value", "Source draft");
}
function detailDraft() {
  fireEvent.click(screen.getByRole("button", { name: "Story 2の詳細" }));
  const panel = within(screen.getByRole("dialog", { name: "詳細パネル" }));
  fireEvent.click(panel.getByRole("button", { name: "編集" }));
  fireEvent.change(panel.getByLabelText("名前"), {
    target: { value: "Edited source" },
  });
}
function prompt(name = "未保存の追加入力") {
  return within(screen.getByRole("alertdialog", { name }));
}
async function readProject(path: string) {
  return parseProjectYaml(await fs.readFile(join(path, "A.yaml"), "utf8"));
}
beforeEach(async () => {
  resetHost();
  subscriptions = [];
  root = await fs.mkdtemp(join(tmpdir(), "gb-reconnect-"));
  a = join(root, "a", "manage.yaml");
  b = join(root, "b", "manage.yaml");
  for (const [path, name] of [
    [a, "Alpha"],
    [b, "Beta"],
  ]) {
    await fs.mkdir(join(path, ".."), { recursive: true });
    await fs.writeFile(
      path,
      "settings: {workdays_off: [], public_holidays: false}\nprojects: [{file: A.yaml, load: true}]\n",
    );
    await fs.writeFile(
      join(path, "..", "A.yaml"),
      JSON.stringify(payload(name)),
    );
  }
  host.path = a;
  activate({ extensionUri: { fsPath: root }, subscriptions } as never);
  host.provider?.resolveWebviewView({
    visible: false,
    webview: webview("events"),
    show() {},
  });
  await host.openBoard?.();
  host.onMessage = (surface, message) => {
    if (surface === "board")
      window.dispatchEvent(new MessageEvent("message", { data: message }));
  };
  render(<BoardApp />);
  await flush();
  // 左から非既定 Event を選び、さらに2番目の Story を選択する。
  await act(async () => {
    await host.receivers.events?.({
      type: "selectEvent",
      eventId: id(3),
      projectFile: "A.yaml",
    });
  });
  await vi.waitFor(() =>
    expect(
      screen.getByRole("region", { name: "Event詳細" }).textContent,
    ).toContain("Alpha Event 2"),
  );
  fireEvent.click(screen.getByText("Story 2", { selector: ".story-name" }));
  await flush();
});
afterEach(async () => {
  cleanup();
  subscriptions.forEach((d) => {
    d.dispose();
  });
  vi.mocked(fs.writeFile).mockReset();
  vi.mocked(fs.writeFile).mockImplementation(
    (await vi.importActual<typeof fs>("node:fs/promises")).writeFile,
  );
  await fs.rm(root, { recursive: true, force: true });
});
it("REQ-013-S05 同一ファイルの反復再設定は非既定 Event/Story と両下書きを保持する", async () => {
  taskDraft();
  detailDraft();
  await unset();
  await act(async () => {
    await choose(a);
  });
  await flush();
  assertTaskDraft();
  expect(
    within(screen.getByRole("dialog", { name: "詳細パネル" })).getByLabelText(
      "名前",
    ),
  ).toHaveProperty("value", "Edited source");
  expect(latest("board").selectedEventId).toBe(id(3));
  await unset();
  await act(async () => {
    await choose(a);
  });
  assertTaskDraft();
  fireEvent.click(
    within(screen.getByRole("region", { name: "Task一覧" })).getByRole(
      "button",
      { name: "追加" },
    ),
  );
  await vi.waitFor(async () =>
    expect(
      (await readProject(join(a, ".."))).events[1].stories[1].tasks.map(
        (t: { name: string }) => t.name,
      ),
    ).toEqual(["Source draft"]),
  );
  expect((await readProject(join(a, ".."))).events[0].stories[1].tasks).toEqual(
    [],
  );
});
it.each(["detail", "inline"])(
  "REQ-013-S06 %s の取消は接続と未保存入力を変更しない",
  async (phase) => {
    taskDraft();
    if (phase === "detail") detailDraft();
    await unset();
    const before = await fs.readFile(join(a, "..", "A.yaml"), "utf8");
    let pending: Promise<void>;
    act(() => {
      pending = choose(b);
    });
    await vi.waitFor(() =>
      expect(
        screen.queryByRole("alertdialog", {
          name: phase === "detail" ? "未保存の編集" : "未保存の追加入力",
        }),
      ).not.toBeNull(),
    );
    expect(host.path).toBe("");
    expect(host.update).not.toHaveBeenCalled();
    fireEvent.click(
      prompt(
        phase === "detail" ? "未保存の編集" : "未保存の追加入力",
      ).getByRole("button", { name: "キャンセル" }),
    );
    await act(async () => {
      await pending;
    });
    assertTaskDraft();
    expect(host.path).toBe("");
    if (phase === "detail")
      expect(
        within(
          screen.getByRole("dialog", { name: "詳細パネル" }),
        ).getByLabelText("名前"),
      ).toHaveProperty("value", "Edited source");
    expect(await fs.readFile(join(a, "..", "A.yaml"), "utf8")).toBe(before);
  },
);
it("REQ-013-S07 元の詳細と Task を保存した後で別管理ファイルへ切り替える", async () => {
  taskDraft();
  detailDraft();
  await unset();
  const dest = await fs.readFile(join(b, "..", "A.yaml"), "utf8");
  let pending: Promise<void>;
  act(() => {
    pending = choose(b);
  });
  await vi.waitFor(() =>
    expect(
      screen.queryByRole("alertdialog", { name: "未保存の編集" }),
    ).not.toBeNull(),
  );
  fireEvent.click(
    prompt("未保存の編集").getByRole("button", { name: "保存して進む" }),
  );
  await vi.waitFor(() =>
    expect(
      screen.queryByRole("alertdialog", { name: "未保存の追加入力" }),
    ).not.toBeNull(),
  );
  fireEvent.click(prompt().getByRole("button", { name: "追加して進む" }));
  await act(async () => {
    await pending;
  });
  const source = await readProject(join(a, ".."));
  expect(source.events[1].stories[1].name).toBe("Edited source");
  expect(
    source.events[1].stories[1].tasks.map((t: { name: string }) => t.name),
  ).toEqual(["Source draft"]);
  expect(await fs.readFile(join(b, "..", "A.yaml"), "utf8")).toBe(dest);
  expect(host.path).toBe(b);
  expect(latest("board").projects[0].name).toBe("Beta");
  expect(screen.queryByRole("dialog", { name: "詳細パネル" })).toBeNull();
});
it("REQ-013-S08 保存失敗は元の下書きと設定を保持し、再試行は1回だけ保存する", async () => {
  taskDraft();
  await unset();
  const actual = await vi.importActual<typeof fs>("node:fs/promises");
  vi.mocked(fs.writeFile).mockRejectedValueOnce(new Error("EACCES source"));
  let pending: Promise<void>;
  act(() => {
    pending = choose(b);
  });
  await vi.waitFor(() =>
    expect(
      screen.queryByRole("alertdialog", { name: "未保存の追加入力" }),
    ).not.toBeNull(),
  );
  fireEvent.click(prompt().getByRole("button", { name: "追加して進む" }));
  await vi.waitFor(() =>
    expect(prompt().getByRole("alert").textContent).toContain("失敗"),
  );
  assertTaskDraft();
  expect(host.path).toBe("");
  expect((await readProject(join(a, ".."))).events[1].stories[1].tasks).toEqual(
    [],
  );
  vi.mocked(fs.writeFile).mockImplementation(actual.writeFile);
  fireEvent.click(prompt().getByRole("button", { name: "追加して進む" }));
  await act(async () => {
    await pending;
  });
  expect(
    (await readProject(join(a, ".."))).events[1].stories[1].tasks.map(
      (t: { name: string }) => t.name,
    ),
  ).toEqual(["Source draft"]);
  expect(host.path).toBe(b);
});
it("REQ-013-S08 保存失敗後もキャンセルでき、再選択時に入力が残る", async () => {
  taskDraft();
  await unset();
  vi.mocked(fs.writeFile).mockRejectedValueOnce(new Error("EACCES source"));
  let pending: Promise<void>;
  act(() => {
    pending = choose(b);
  });
  await vi.waitFor(() =>
    expect(
      screen.queryByRole("alertdialog", { name: "未保存の追加入力" }),
    ).not.toBeNull(),
  );
  fireEvent.click(prompt().getByRole("button", { name: "追加して進む" }));
  await vi.waitFor(() =>
    expect(prompt().getByRole("alert").textContent).toContain("失敗"),
  );
  fireEvent.click(prompt().getByRole("button", { name: "キャンセル" }));
  await act(async () => {
    await pending;
  });
  assertTaskDraft();
  await act(async () => {
    await choose(a);
  });
  assertTaskDraft();
  expect(host.path).toBe(a);
});
it("REQ-013-S09 同じ参照と UUID の別データへ破棄して進むと選択と入力を引き継がない", async () => {
  const beta = payload("Beta");
  beta.events[1].due = "2098-01-01";
  await fs.writeFile(join(b, "..", "A.yaml"), JSON.stringify(beta));
  taskDraft();
  fireEvent.click(screen.getByRole("button", { name: "Story 2の詳細" }));
  await unset();
  const before = await fs.readFile(join(a, "..", "A.yaml"), "utf8");
  let pending: Promise<void>;
  act(() => {
    pending = choose(b);
  });
  await vi.waitFor(() =>
    expect(
      screen.queryByRole("alertdialog", { name: "未保存の追加入力" }),
    ).not.toBeNull(),
  );
  fireEvent.click(prompt().getByRole("button", { name: "破棄して進む" }));
  await act(async () => {
    await pending;
  });
  expect(await fs.readFile(join(a, "..", "A.yaml"), "utf8")).toBe(before);
  expect(
    screen.getByRole("region", { name: "Event詳細" }).textContent,
  ).toContain("Beta Event 2");
  expect(
    screen.getByRole("main").querySelector(".story-choice.selected .story-name")
      ?.textContent,
  ).toBe("Story 1");
  expect(screen.queryByRole("textbox", { name: "名前" })).toBeNull();
  expect(screen.queryByRole("dialog", { name: "詳細パネル" })).toBeNull();
  expect(host.watchers.at(-1)?.base).toBe(join(b, ".."));
});
it("REQ-013-S10 設定画面の別ファイル指定をキャンセルすると設定と監視を戻す", async () => {
  taskDraft();
  host.path = b;
  act(() => host.config?.({ affectsConfiguration: () => true }));
  await vi.waitFor(() =>
    expect(
      screen.queryByRole("alertdialog", { name: "未保存の追加入力" }),
    ).not.toBeNull(),
  );
  fireEvent.click(prompt().getByRole("button", { name: "キャンセル" }));
  await vi.waitFor(() => expect(host.path).toBe(a));
  await flush();
  assertTaskDraft();
  expect(host.watchers.at(-1)?.base).toBe(join(a, ".."));
  expect(latest("board").selectedEventId).toBe(id(3));
});
it("REQ-013-S11 Project 追加の名前と色は切替取消と保存失敗でも保持する", async () => {
  fireEvent.click(screen.getByRole("button", { name: "Projectを追加" }));
  fireEvent.change(screen.getByRole("textbox", { name: "名前" }), {
    target: { value: "Draft project" },
  });
  await unset();
  let pending: Promise<void>;
  act(() => {
    pending = choose(b);
  });
  await vi.waitFor(() =>
    expect(
      screen.queryByRole("alertdialog", { name: "未保存の Project 追加" }),
    ).not.toBeNull(),
  );
  fireEvent.click(
    prompt("未保存の Project 追加").getByRole("button", { name: "キャンセル" }),
  );
  await act(async () => {
    await pending;
  });
  expect(screen.getByRole("textbox", { name: "名前" })).toHaveProperty(
    "value",
    "Draft project",
  );
  expect(host.path).toBe("");
});
it("REQ-013-S06 新規作成の取消では候補ファイルを作成しない", async () => {
  taskDraft();
  await unset();
  const target = join(root, "new.yaml");
  let pending: Promise<void>;
  act(() => {
    pending = choose(target, "createManage");
  });
  await vi.waitFor(() =>
    expect(
      screen.queryByRole("alertdialog", { name: "未保存の追加入力" }),
    ).not.toBeNull(),
  );
  fireEvent.click(prompt().getByRole("button", { name: "キャンセル" }));
  await act(async () => {
    await pending;
  });
  expect(
    await fs.stat(target).then(
      () => true,
      () => false,
    ),
  ).toBe(false);
  expect(host.path).toBe("");
  assertTaskDraft();
});

it("REQ-013-S06 確認中のパネル閉鎖は設定を変えず応答待ちを解放する", async () => {
  taskDraft();
  await unset();
  let pending: Promise<void>;
  act(() => {
    pending = choose(b);
  });
  await vi.waitFor(() =>
    expect(
      screen.queryByRole("alertdialog", { name: "未保存の追加入力" }),
    ).not.toBeNull(),
  );
  act(() => host.closePanel?.());
  await act(async () => {
    await pending;
  });
  expect(host.path).toBe("");
  expect(host.update).not.toHaveBeenCalled();
});
it("REQ-013-S11 Project 追加失敗後のキャンセルは名前と色を残す", async () => {
  fireEvent.click(screen.getByRole("button", { name: "Projectを追加" }));
  fireEvent.change(screen.getByRole("textbox", { name: "名前" }), {
    target: { value: "Project draft" },
  });
  fireEvent.change(screen.getByLabelText("色"), {
    target: { value: "#abcdef" },
  });
  await unset();
  vi.mocked(fs.writeFile).mockRejectedValueOnce(new Error("EACCES project"));
  let pending: Promise<void>;
  act(() => {
    pending = choose(b);
  });
  await vi.waitFor(() =>
    expect(
      screen.queryByRole("alertdialog", { name: "未保存の Project 追加" }),
    ).not.toBeNull(),
  );
  fireEvent.click(
    prompt("未保存の Project 追加").getByRole("button", {
      name: "追加して進む",
    }),
  );
  await vi.waitFor(() =>
    expect(prompt("未保存の Project 追加").getByRole("alert").textContent).toBe(
      "追加に失敗しました。入力を残しています。",
    ),
  );
  expect(host.path).toBe("");
  fireEvent.keyDown(
    screen.getByRole("alertdialog", { name: "未保存の Project 追加" }),
    { key: "Escape" },
  );
  await act(async () => {
    await pending;
  });
  expect(screen.getByRole("textbox", { name: "名前" })).toHaveProperty(
    "value",
    "Project draft",
  );
  expect(screen.getByLabelText("色")).toHaveProperty("value", "#abcdef");
});
it("REQ-013-S08 詳細保存の失敗と取消は Task の下書きも保持する", async () => {
  taskDraft();
  detailDraft();
  await unset();
  vi.mocked(fs.writeFile).mockRejectedValueOnce(new Error("EACCES detail"));
  let pending: Promise<void>;
  act(() => {
    pending = choose(b);
  });
  await vi.waitFor(() =>
    expect(
      screen.queryByRole("alertdialog", { name: "未保存の編集" }),
    ).not.toBeNull(),
  );
  fireEvent.click(
    prompt("未保存の編集").getByRole("button", { name: "保存して進む" }),
  );
  await vi.waitFor(() =>
    expect(prompt("未保存の編集").getByRole("alert").textContent).toContain(
      "保存に失敗",
    ),
  );
  expect(host.path).toBe("");
  assertTaskDraft();
  fireEvent.keyDown(screen.getByRole("alertdialog", { name: "未保存の編集" }), {
    key: "Escape",
  });
  await act(async () => {
    await pending;
  });
  assertTaskDraft();
  expect(
    within(screen.getByRole("dialog", { name: "詳細パネル" })).getByLabelText(
      "名前",
    ),
  ).toHaveProperty("value", "Edited source");
});
it("REQ-013-S07 未設定中の通常保存は拒否し、明示的な切替確認でだけ元へ保存できる", async () => {
  taskDraft();
  await unset();
  fireEvent.click(
    within(screen.getByRole("region", { name: "Task一覧" })).getByRole(
      "button",
      { name: "追加" },
    ),
  );
  await vi.waitFor(() =>
    expect(screen.getByRole("alert").textContent).toBe("manage.yamlが未設定"),
  );
  assertTaskDraft();
  expect((await readProject(join(a, ".."))).events[1].stories[1].tasks).toEqual(
    [],
  );
});
it("REQ-013-S09 切替後に届いた元の接続の操作を新しいファイルへ配送しない", async () => {
  await unset();
  await act(async () => {
    await choose(b);
  });
  const dest = await fs.readFile(join(b, "..", "A.yaml"), "utf8");
  await act(async () => {
    await host.receivers.board?.({
      type: "addTask",
      storyId: id(22),
      projectFile: "A.yaml",
      name: "Late source",
      connectionId: a,
      requestId: 333,
    });
  });
  expect(await fs.readFile(join(b, "..", "A.yaml"), "utf8")).toBe(dest);
  expect(host.messages.board.at(-1)).toEqual({
    type: "operationResult",
    requestId: 333,
    payload: {
      ok: false,
      error: "管理ファイルの接続先が変わったため操作できません。",
    },
  });
});
it("REQ-013-S12 別接続の欠落中は前の表示を読取専用にし、復元時に新しい入力を失わない", async () => {
  taskDraft();
  await unset();
  await fs.unlink(b);
  let pending: Promise<void>;
  act(() => {
    pending = choose(b);
  });
  await vi.waitFor(() =>
    expect(
      screen.queryByRole("alertdialog", { name: "未保存の追加入力" }),
    ).not.toBeNull(),
  );
  fireEvent.click(prompt().getByRole("button", { name: "破棄して進む" }));
  await act(async () => {
    await pending;
  });
  expect(
    screen
      .getByRole("main")
      .querySelector(".board-interaction")
      ?.hasAttribute("inert"),
  ).toBe(true);
  expect(
    screen.getByRole("region", { name: "Event詳細" }).textContent,
  ).toContain("Alpha Event 2");
  await fs.writeFile(
    b,
    "settings: {workdays_off: [], public_holidays: false}\nprojects: [{file: A.yaml, load: true}]\n",
  );
  act(() => host.watchers.at(-1)?.create?.());
  await vi.waitFor(() =>
    expect(
      screen.getByRole("region", { name: "Event詳細" }).textContent,
    ).toContain("Beta Event 1"),
  );
  expect(
    screen
      .getByRole("main")
      .querySelector(".board-interaction")
      ?.hasAttribute("inert"),
  ).toBe(false);
});
it("REQ-013-S06 接続準備の確定から設定保存の完了まで旧表示への新規入力を止め、作成失敗では解除する", async () => {
  taskDraft();
  await unset();
  let pending: Promise<void>;
  act(() => {
    pending = choose(b, "createManage");
  });
  await vi.waitFor(() =>
    expect(
      screen.queryByRole("alertdialog", { name: "未保存の追加入力" }),
    ).not.toBeNull(),
  );
  fireEvent.click(prompt().getByRole("button", { name: "破棄して進む" }));
  expect(
    screen
      .getByRole("main")
      .querySelector(".board-interaction")
      ?.hasAttribute("inert"),
  ).toBe(true);
  await act(async () => {
    await pending;
  });
  expect(host.path).toBe("");
  expect(
    screen
      .getByRole("main")
      .querySelector(".board-interaction")
      ?.hasAttribute("inert"),
  ).toBe(false);
});

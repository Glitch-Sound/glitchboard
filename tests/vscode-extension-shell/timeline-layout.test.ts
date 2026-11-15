import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { activate } from "../../packages/extension/src/extension.js";
import { host, resetHost } from "./extension-harness.js";

vi.mock("vscode", async () =>
  (await import("./extension-harness.js")).vscodeMock(),
);
let root: string, manage: string;
let subscriptions: { dispose(): void }[];
const values = new Map<string, unknown>();
const get = vi.fn((key: string) => values.get(key));
const update = vi.fn(async (key: string, value: unknown) => {
  values.set(key, value);
});
beforeEach(async () => {
  resetHost();
  values.clear();
  get.mockClear();
  update.mockReset();
  update.mockImplementation(async (key, value) => {
    values.set(key, value);
  });
  root = await mkdtemp(join(tmpdir(), "gb-cell-layout-"));
  manage = join(root, "manage.yaml");
  subscriptions = [];
  await writeFile(
    manage,
    "# サイズ変更では更新しない\nsettings: {workdays_off: [sat, sun], public_holidays: true}\nprojects: []\n",
  );
});
afterEach(async () => {
  for (const item of subscriptions) item.dispose();
  await rm(root, { recursive: true, force: true });
});
async function start() {
  host.path = manage;
  activate({
    extensionUri: { fsPath: root },
    subscriptions,
    globalState: { get, update },
  } as never);
  await host.openBoard?.();
}
function initial() {
  const html = host.panels.at(-1)?.html ?? "";
  const match = html.match(/data-timeline-layout="([^"]+)"/);
  expect(match).not.toBeNull();
  return JSON.parse(match?.[1].replaceAll("&quot;", '"') ?? "null");
}
const send = (requestId: number, width: number, height: number) =>
  host.receivers.board({
    type: "saveTimelineLayout",
    requestId,
    layout: { width, height },
  });
it("REQ-040-S01 保存済み寸法はタブの開き直しと拡張の再起動で復元し、YAML を変更しない", async () => {
  values.set("timelineLayout", { width: 240, height: 56 });
  const before = await readFile(manage);
  const time = (await stat(manage, { bigint: true })).mtimeNs;
  await start();
  expect(initial()).toEqual({ width: 240, height: 56 });
  await send(1, 304, 72);
  host.closePanel?.();
  await host.openBoard?.();
  expect(initial()).toEqual({ width: 304, height: 72 });
  for (const item of subscriptions) item.dispose();
  subscriptions = [];
  resetHost();
  await start();
  expect(initial()).toEqual({ width: 304, height: 72 });
  expect(await readFile(manage)).toEqual(before);
  expect((await stat(manage, { bigint: true })).mtimeNs).toBe(time);
});
it("REQ-040-S01 表示設定の保存は順番を守り、最後の寸法を残す", async () => {
  await start();
  let release: () => void = () => {};
  update.mockImplementationOnce(
    (key, value) =>
      new Promise<void>((resolve) => {
        release = () => {
          values.set(key, value);
          resolve();
        };
      }),
  );
  const first = send(1, 300, 64),
    second = send(2, 320, 80);
  await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
  release();
  await Promise.all([first, second]);
  expect(update.mock.calls).toEqual([
    ["timelineLayout", { width: 300, height: 64 }],
    ["timelineLayout", { width: 320, height: 80 }],
  ]);
  host.closePanel?.();
  await host.openBoard?.();
  expect(initial()).toEqual({ width: 320, height: 80 });
});
it("REQ-040-S13 保存失敗は専用の結果で通知し、次の保存を妨げない", async () => {
  await start();
  update.mockRejectedValueOnce(new Error("検証用の設定保存失敗"));
  await send(7, 300, 64);
  expect(
    host.messages.board.filter(
      (message) => message.type === "timelineLayoutResult",
    ),
  ).toEqual([
    {
      type: "timelineLayoutResult",
      requestId: 7,
      ok: false,
      error: "検証用の設定保存失敗",
    },
  ]);
  await send(8, 312, 72);
  host.closePanel?.();
  await host.openBoard?.();
  expect(initial()).toEqual({ width: 312, height: 72 });
});
it("REQ-040-S13 不正な復元値と受信値は保存へ渡さない", async () => {
  values.set("timelineLayout", { width: "<script>", height: 56 });
  await start();
  expect(initial()).toBeNull();
  await host.receivers.board({
    type: "saveTimelineLayout",
    requestId: 9,
    layout: { width: "300", height: 56 },
  });
  expect(update).not.toHaveBeenCalled();
  expect(host.messages.board.at(-1)).toEqual({
    type: "timelineLayoutResult",
    requestId: 9,
    ok: false,
    error: "表示設定の形式が不正です",
  });
});

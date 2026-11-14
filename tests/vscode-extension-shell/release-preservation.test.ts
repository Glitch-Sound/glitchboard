import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { activate } from "../../packages/extension/src/extension.js";
import { host, latest, resetHost, webview } from "./extension-harness.js";

vi.mock("vscode", async () =>
  (await import("./extension-harness.js")).vscodeMock(),
);
let root: string;
let manage: string;
let project: string;
let subscriptions: { dispose(): void }[];
beforeEach(async () => {
  resetHost();
  root = await mkdtemp(join(tmpdir(), "gb-release-preservation-"));
  manage = join(root, "manage.yaml");
  project = join(root, "projects", "0001_Legacy.yaml");
  subscriptions = [];
  await mkdir(join(root, "projects"));
});
afterEach(async () => {
  subscriptions.forEach((item) => {
    item.dispose();
  });
  await rm(root, { recursive: true, force: true });
});
async function fixture(due: string) {
  await writeFile(
    manage,
    "# 保管する旧管理ファイル\nsettings: {workdays_off: [sat, sun], public_holidays: true}\nprojects: [{file: projects/0001_Legacy.yaml, load: true}]\nlegacy_setting: preserve\n",
  );
  await writeFile(
    project,
    `# Story を必須としていた形式のサンプル\nid: 00000000-0000-4000-8000-000000000001\nname: Legacy\ncolor: '#123456'\nlegacy_field: preserve\nevents:\n  - id: 00000000-0000-4000-8000-000000000002\n    name: Event\n    due: ${due}\n    stories:\n      - id: 00000000-0000-4000-8000-000000000003\n        name: Story\n        tasks:\n          - id: 00000000-0000-4000-8000-000000000004\n            name: Task\n            points: 3\n`,
  );
}
async function originals() {
  return Promise.all(
    [manage, project].map(async (path) => ({
      bytes: await readFile(path),
      mtime: (await stat(path, { bigint: true })).mtimeNs,
    })),
  );
}
async function start() {
  host.path = manage;
  host.workspacePath = "/new-workspace";
  activate({ extensionUri: { fsPath: root }, subscriptions } as never);
  host.provider?.resolveWebviewView({ webview: webview("events") });
  await host.openBoard?.();
  await vi.waitFor(() =>
    expect(latest("events")).toHaveProperty(
      "manageAvailability.status",
      "ready",
    ),
  );
}

it.each(["2026-11-20", "2026-02-30"])(
  "REQ-002-S01 REQ-004-S01 更新後の読込と反復起動は旧形式サンプルを自動変更しない (%s)",
  async (due) => {
    await fixture(due);
    const before = await originals();
    await start();
    for (let index = 0; index < 2; index++) await host.openBoard?.();
    if (due === "2026-02-30") expect(latest("events").error).toContain("日付");
    else expect(latest("events").projects).toHaveLength(1);
    expect(await originals()).toEqual(before);
    expect((await readdir(root)).sort()).toEqual(["manage.yaml", "projects"]);
    expect(await readdir(join(root, "projects"))).toEqual(["0001_Legacy.yaml"]);
    expect(host.update).not.toHaveBeenCalled();
  },
);

it("REQ-013-S06 既存ファイルへの新規作成は拒否し、設定と旧データを変更しない", async () => {
  await fixture("2026-11-20");
  const before = await originals();
  await start();
  host.saveDialog.mockResolvedValueOnce({ fsPath: manage });
  await host.receivers.events?.({ type: "createManage", requestId: 902 });
  const result = host.messages.events.find(
    (message) => (message as { requestId?: number }).requestId === 902,
  );
  expect(result).toMatchObject({
    type: "operationResult",
    payload: { ok: false },
  });
  expect(host.update).not.toHaveBeenCalled();
  expect(await originals()).toEqual(before);
});

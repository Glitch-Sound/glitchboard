import { mkdtemp, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, matchesGlob, relative } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigurationTarget } from "vscode";
import { activate } from "../../packages/extension/src/extension.js";
import { BoardSession } from "../../packages/extension/src/session.js";
import { host, latest, resetHost, webview } from "./extension-harness.js";

vi.mock("vscode", async () =>
  (await import("./extension-harness.js")).vscodeMock(),
);
let root: string;
let disposables: { dispose(): void }[];
beforeEach(async () => {
  resetHost();
  root = await mkdtemp(join(tmpdir(), "gb-connect-"));
  disposables = [];
});
afterEach(async () => {
  disposables.forEach((d) => {
    d.dispose();
  });
  await rm(root, { recursive: true, force: true });
});
function start() {
  activate({
    extensionUri: { fsPath: root },
    subscriptions: disposables,
  } as never);
  host.provider?.resolveWebviewView({ webview: webview("events") });
  host.openBoard?.();
}
function notify(path: string, event: "change" | "create" | "delete") {
  const matching = host.watchers.filter(
    (watcher) =>
      !watcher.disposed &&
      matchesGlob(relative(watcher.base, path), watcher.pattern),
  );
  for (const watcher of matching) watcher[event]?.();
  return matching.length;
}
const manageSource = (file?: string) =>
  JSON.stringify({
    settings: { workdays_off: [], public_holidays: false },
    projects: file ? [{ file, load: true }] : [],
  });
const projectSource = (name = "Alpha") =>
  JSON.stringify({
    id: "11111111-1111-4111-8111-111111111111",
    name,
    color: "#123456",
    events: [],
  });

describe("管理ファイルの接続", () => {
  it.each(["chooseManage", "createManage"])(
    "REQ-039-S01 %s は別ワークスペースでも共有するユーザー設定へ保存する",
    async (type) => {
      let globalPath = "";
      host.update.mockImplementation(
        async (_key: string, path: string, target: number) => {
          if (target === ConfigurationTarget.Global) globalPath = path;
          host.path = path;
          host.config?.({ affectsConfiguration: () => true });
        },
      );
      const path = join(root, "manage.yaml");
      if (type === "chooseManage") {
        await writeFile(path, manageSource());
        host.openDialog.mockResolvedValueOnce([{ fsPath: path }]);
      } else host.saveDialog.mockResolvedValueOnce({ fsPath: path });
      start();
      await host.receivers.board?.({ type });
      expect(host.update).toHaveBeenCalledWith(
        "manageFile",
        path,
        ConfigurationTarget.Global,
      );
      disposables.forEach((d) => {
        d.dispose();
      });
      disposables = [];
      host.workspacePath = "/another-workspace";
      host.path = globalPath;
      host.messages.board = [];
      host.messages.events = [];
      start();
      await vi.waitFor(() =>
        expect(latest("board")).toMatchObject({
          manageAvailability: { status: "ready" },
          error: null,
        }),
      );
      expect(globalPath).toBe(path);
      expect(latest("events")).toEqual(latest("board"));
    },
  );
  it.each(["yaml", "yml"])(
    "REQ-039-S02 実登録パターンが .%s の変更、削除、作成へ反応する",
    async (extension) => {
      const path = join(root, `manage.${extension}`);
      const file = `project.${extension}`;
      const project = join(root, file);
      await writeFile(path, manageSource(file));
      await writeFile(project, projectSource());
      host.path = path;
      start();
      await vi.waitFor(() => expect(latest("board").projects).toHaveLength(1));
      expect(host.watchers[0].base).toBe(root);
      for (const name of [
        "manage.yaml",
        "manage.yml",
        "projects/a.yaml",
        "projects/b.yml",
      ])
        expect(matchesGlob(name, host.watchers[0].pattern)).toBe(true);
      expect(matchesGlob("data.json", host.watchers[0].pattern)).toBe(false);
      await writeFile(project, projectSource("Changed"));
      expect(notify(project, "change")).toBe(1);
      await vi.waitFor(() =>
        expect(latest("board").projects[0]?.name).toBe("Changed"),
      );
      await unlink(project);
      notify(project, "delete");
      await vi.waitFor(() => expect(latest("board").error).toContain(file));
      await writeFile(project, projectSource("Restored"));
      notify(project, "create");
      await vi.waitFor(() =>
        expect(latest("board")).toMatchObject({
          error: null,
          projects: [{ name: "Restored" }],
        }),
      );
      await unlink(path);
      notify(path, "delete");
      await vi.waitFor(() =>
        expect(latest("board").manageAvailability?.status).toBe("missing"),
      );
      await writeFile(path, manageSource(file));
      notify(path, "create");
      await vi.waitFor(() =>
        expect(latest("board")).toMatchObject({
          error: null,
          manageAvailability: { status: "ready" },
        }),
      );
      expect(latest("events")).toEqual(latest("board"));
    },
  );
  it("REQ-003-S03 非読込ファイルの欠落で正常Projectの初回表示を妨げない", async () => {
    const manage = join(root, "manage.yaml");
    await writeFile(
      manage,
      JSON.stringify({
        settings: { workdays_off: [], public_holidays: false },
        projects: [
          { file: "A.yaml", load: true },
          { file: "missing.yml", load: false },
        ],
      }),
    );
    await writeFile(join(root, "A.yaml"), projectSource());
    const before = await readFile(manage, "utf8");
    const session = new BoardSession(manage);
    await session.reload();
    expect(session.snapshot().error).toBeNull();
    expect(session.snapshot().projects.map((p) => p.name)).toEqual(["Alpha"]);
    expect(session.snapshot().projectEntries[1]).toEqual({
      file: "missing.yml",
      load: false,
      name: "missing.yml (利用不可)",
    });
    expect(await readFile(manage, "utf8")).toBe(before);
  });
});

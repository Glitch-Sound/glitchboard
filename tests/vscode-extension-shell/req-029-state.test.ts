import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activate } from "../../packages/extension/src/extension.js";
import { BoardSession } from "../../packages/extension/src/session.js";
import { host, latest, resetHost, webview } from "./extension-harness.js";

vi.mock("vscode", async () => {
  const { vscodeMock } = await import("./extension-harness.js");
  return vscodeMock();
});

vi.mock("node:fs/promises", async (original) => {
  const actual = await original<typeof import("node:fs/promises")>();
  return {
    ...actual,
    readFile: vi.fn(actual.readFile),
    writeFile: vi.fn(actual.writeFile),
  };
});

const valid =
  "settings: {workdays_off: [sun], public_holidays: false}\nprojects: []\n";
let root: string;
let path: string;
let disposables: { dispose(): void }[];
beforeEach(async () => {
  resetHost();
  root = await fs.mkdtemp(join(tmpdir(), "gb-missing-"));
  path = join(root, "manage.yaml");
  disposables = [];
});
afterEach(async () => {
  for (const disposable of disposables) disposable.dispose();
  vi.restoreAllMocks();
  await fs.rm(root, { recursive: true, force: true });
});
function start() {
  host.path = path;
  activate({
    extensionUri: { fsPath: root },
    subscriptions: disposables,
  } as never);
  host.provider?.resolveWebviewView({ webview: webview("events"), show() {} });
  host.openBoard?.();
}

describe("REQ-029 管理ファイルの状態", () => {
  it("REQ-029-S02 起動時の不在を両画面と後から開く画面へ配信する", async () => {
    start();
    await vi.waitFor(() =>
      expect(latest("events")).toMatchObject({
        manageAvailability: { status: "missing", path },
      }),
    );
    expect(latest("board")).toEqual(latest("events"));
    await host.receivers.board?.({ type: "ready" });
    expect(latest("board")).toMatchObject({
      manageAvailability: { status: "missing", path },
    });
    host.provider?.resolveWebviewView({ webview: webview("events") });
    expect(latest("events")).toEqual(latest("board"));
    expect(host.update).not.toHaveBeenCalled();
  });
  it("REQ-029-S02 設定変更後の不在と旧監視の通知抑止", async () => {
    await fs.writeFile(path, valid);
    start();
    await vi.waitFor(() => expect(latest("board").version).toBeGreaterThan(0));
    const old = host.watchers[0];
    host.path = join(root, "missing.yaml");
    host.config?.({ affectsConfiguration: () => true });
    await vi.waitFor(() =>
      expect(latest("board")).toMatchObject({
        manageAvailability: { status: "missing", path: host.path },
      }),
    );
    const count = host.messages.board.length;
    old?.change?.();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(host.messages.board).toHaveLength(count);
    expect(old?.disposed).toBe(true);
  });
  it("REQ-029-S03/REQ-029-S10 削除後も直前データを保持し、復元後に解除する", async () => {
    const source = valid.replace(
      "projects: []",
      "projects: [{file: project.yaml, load: true}]",
    );
    await fs.writeFile(
      join(root, "project.yaml"),
      "id: 11111111-1111-4111-8111-111111111111\nname: Alpha\ncolor: '#123456'\nevents: [{id: 22222222-2222-4222-8222-222222222222, name: Launch, due: '2099-01-01', stories: []}]\n",
    );
    await fs.writeFile(path, source);
    start();
    await vi.waitFor(() => expect(latest("board").version).toBeGreaterThan(0));
    const before = latest("board");
    expect(before.projects).toHaveLength(1);
    expect(before.selectedEventId).toBe("22222222-2222-4222-8222-222222222222");
    await fs.unlink(path);
    host.watchers[0]?.delete?.();
    await vi.waitFor(() =>
      expect(latest("board")).toMatchObject({
        manageAvailability: { status: "missing", path },
      }),
    );
    expect(latest("board").projects).toEqual(before.projects);
    expect(latest("board").settings).toEqual(before.settings);
    expect(latest("events")).toEqual(latest("board"));
    expect(latest("board").selectedEventId).toBe(before.selectedEventId);
    await fs.writeFile(path, source);
    host.watchers[0]?.create?.();
    await vi.waitFor(() =>
      expect(latest("board")).toMatchObject({
        error: null,
        manageAvailability: { status: "ready" },
      }),
    );
    expect(latest("events")).toEqual(latest("board"));
  });
  it.each(["project", "syntax", "permission"])(
    "REQ-029-S08 %sを管理ファイル不在にしない",
    async (kind) => {
      await fs.writeFile(path, valid);
      const session = new BoardSession(path);
      await session.reload();
      const before = session.snapshot();
      if (kind === "project")
        await fs.writeFile(
          path,
          valid.replace(
            "projects: []",
            "projects: [{file: absent.yaml, load: true}]",
          ),
        );
      if (kind === "syntax") await fs.writeFile(path, "settings: [");
      if (kind === "permission")
        vi.mocked(fs.readFile).mockRejectedValueOnce(
          Object.assign(new Error("permission denied"), { code: "EACCES" }),
        );
      await session.reload();
      expect(session.snapshot().error).toBeTruthy();
      expect(session.snapshot()).toMatchObject({
        manageAvailability: { status: "ready" },
        projects: before.projects,
      });
    },
  );
});

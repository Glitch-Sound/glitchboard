import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activate } from "../../packages/extension/src/extension.js";
import { host, latest, resetHost, webview } from "./extension-harness.js";

vi.mock("vscode", async () =>
  (await import("./extension-harness.js")).vscodeMock(),
);
vi.mock("node:fs/promises", async (original) => {
  const actual = await original<typeof import("node:fs/promises")>();
  return { ...actual, readFile: vi.fn(actual.readFile) };
});
let root: string;
let subscriptions: { dispose(): void }[];
let show: (() => void) | undefined;
const valid =
  "settings: {workdays_off: [sun], public_holidays: false}\nprojects: []\n";
function start() {
  activate({ extensionUri: { fsPath: root }, subscriptions } as never);
  host.provider?.resolveWebviewView({
    visible: true,
    webview: webview("events"),
    show() {},
    onDidChangeVisibility(callback: () => void) {
      show = callback;
      return { dispose() {} };
    },
  });
}
function stop() {
  subscriptions.forEach((d) => {
    d.dispose();
  });
  subscriptions = [];
}
beforeEach(async () => {
  resetHost();
  subscriptions = [];
  root = await fs.mkdtemp(join(tmpdir(), "gb-start-"));
  show = undefined;
});
afterEach(async () => {
  stop();
  vi.mocked(fs.readFile).mockReset();
  vi.mocked(fs.readFile).mockImplementation(
    (await vi.importActual<typeof fs>("node:fs/promises")).readFile,
  );
  await fs.rm(root, { recursive: true, force: true });
});
describe("設定に応じたメニュー起動", () => {
  it.each(["unset", "missing"])(
    "REQ-012-S03 %s は判定前にも再表示でもメインを作らない",
    async (mode) => {
      if (mode === "missing") host.path = join(root, "missing.yaml");
      start();
      expect(host.createPanel).not.toHaveBeenCalled();
      if (mode === "missing")
        await vi.waitFor(() =>
          expect(latest("events").manageAvailability?.status).toBe("missing"),
        );
      else expect(host.messages.events.at(-1)?.type).toBe("unconfigured");
      show?.();
      show?.();
      await host.openBoard?.();
      expect(host.createPanel).not.toHaveBeenCalled();
      expect(host.openDialog).not.toHaveBeenCalled();
      expect(host.saveDialog).not.toHaveBeenCalled();
    },
  );
  it("REQ-012-S02 設定済みの反復起動は1つのメインを再利用する", async () => {
    host.path = join(root, "manage.yaml");
    await fs.writeFile(host.path, valid);
    start();
    await vi.waitFor(() => expect(host.createPanel).toHaveBeenCalledTimes(1));
    show?.();
    show?.();
    await host.openBoard?.();
    await vi.waitFor(() =>
      expect(host.revealPanel.mock.calls.length).toBeGreaterThanOrEqual(2),
    );
    expect(host.createPanel).toHaveBeenCalledTimes(1);
    expect(latest("board").error).toBeNull();
    expect(host.update).not.toHaveBeenCalled();
  });
  it.each(["chooseManage", "createManage"])(
    "REQ-012-S04 %s 成功後と再起動後は案内なしの両画面へ進む",
    async (type) => {
      start();
      expect(host.createPanel).not.toHaveBeenCalled();
      const path = join(root, "manage.yaml");
      if (type === "chooseManage") {
        await fs.writeFile(path, valid);
        host.openDialog.mockResolvedValueOnce([{ fsPath: path }]);
      } else host.saveDialog.mockResolvedValueOnce({ fsPath: path });
      await host.receivers.events?.({ type });
      await vi.waitFor(() => expect(host.createPanel).toHaveBeenCalledTimes(1));
      expect(latest("board").manageAvailability?.status).toBe("ready");
      expect(latest("events")).toEqual(latest("board"));
      stop();
      resetHost();
      host.path = path;
      start();
      await vi.waitFor(() => expect(host.createPanel).toHaveBeenCalledTimes(1));
      expect(latest("board").error).toBeNull();
      expect(host.openDialog).not.toHaveBeenCalled();
      expect(host.saveDialog).not.toHaveBeenCalled();
    },
  );
  it.each(["syntax", "project"])(
    "REQ-029-S08 %s のエラーは不在にせず両画面へ出す",
    async (kind) => {
      host.path = join(root, "manage.yaml");
      await fs.writeFile(
        host.path,
        kind === "syntax"
          ? "broken: ["
          : "settings: {workdays_off: [sun], public_holidays: false}\nprojects: [{file: missing.yaml, load: true}]\n",
      );
      start();
      await vi.waitFor(() =>
        expect(latest("events").error).toBeTypeOf("string"),
      );
      await vi.waitFor(() => expect(host.createPanel).toHaveBeenCalledTimes(1));
      expect(latest("board").manageAvailability?.status).toBe("ready");
      expect(latest("board").error).not.toBeNull();
    },
  );
  it("REQ-029-S03 利用中の欠落では既存メインを維持し、新規作成しない", async () => {
    host.path = join(root, "manage.yaml");
    await fs.writeFile(host.path, valid);
    start();
    await vi.waitFor(() => expect(host.createPanel).toHaveBeenCalledTimes(1));
    await fs.unlink(host.path);
    host.watchers
      .filter((w) => !w.disposed)
      .forEach((w) => {
        w.delete?.();
      });
    await vi.waitFor(() =>
      expect(latest("events").manageAvailability?.status).toBe("missing"),
    );
    const reveals = host.revealPanel.mock.calls.length;
    show?.();
    await Promise.resolve();
    expect(host.revealPanel).toHaveBeenCalledTimes(reveals);
    expect(host.createPanel).toHaveBeenCalledTimes(1);
    await fs.writeFile(host.path, valid);
    host.watchers
      .filter((w) => !w.disposed)
      .forEach((w) => {
        w.create?.();
      });
    await vi.waitFor(() =>
      expect(latest("board").manageAvailability?.status).toBe("ready"),
    );
    expect(host.createPanel).toHaveBeenCalledTimes(1);
  });
  it("REQ-012-S03 初回判定中に設定が変わっても古い成功でメインを開かない", async () => {
    host.path = join(root, "manage.yaml");
    await fs.writeFile(host.path, valid);
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const actualFs = await vi.importActual<typeof fs>("node:fs/promises");
    vi.mocked(fs.readFile).mockImplementationOnce(async (...args) => {
      await gate;
      return actualFs.readFile(...args);
    });
    start();
    expect(host.createPanel).not.toHaveBeenCalled();
    const opening = host.openBoard?.();
    host.path = join(root, "missing.yaml");
    host.config?.({ affectsConfiguration: () => true });
    await vi.waitFor(() =>
      expect(latest("events").manageAvailability?.status).toBe("missing"),
    );
    finish();
    await opening;
    expect(host.createPanel).not.toHaveBeenCalled();
  });
  it.each(["unset", "configured"])(
    "REQ-012-S01 REQ-012-S03 コマンド単独の %s でも左の入口へ接続する",
    async (mode) => {
      if (mode === "configured") {
        host.path = join(root, "manage.yaml");
        await fs.writeFile(host.path, valid);
      }
      activate({ extensionUri: { fsPath: root }, subscriptions } as never);
      await host.openBoard?.();
      expect(host.executeCommand).toHaveBeenCalledWith(
        "glitchboard.events.focus",
      );
      expect(host.createPanel).toHaveBeenCalledTimes(
        mode === "configured" ? 1 : 0,
      );
    },
  );
  it.each(["menu", "command"])(
    "REQ-012-S03 REQ-012-S02 %s は監視通知前の削除と復元を判定する",
    async (entry) => {
      host.path = join(root, "manage.yaml");
      await fs.writeFile(host.path, valid);
      start();
      await vi.waitFor(() => expect(host.createPanel).toHaveBeenCalledTimes(1));
      host.closePanel?.();
      await fs.unlink(host.path);
      if (entry === "menu") show?.();
      else await host.openBoard?.();
      await vi.waitFor(() =>
        expect(latest("events").manageAvailability?.status).toBe("missing"),
      );
      expect(host.createPanel).toHaveBeenCalledTimes(1);
      await fs.writeFile(host.path, valid);
      if (entry === "menu") show?.();
      else await host.openBoard?.();
      await vi.waitFor(() => expect(host.createPanel).toHaveBeenCalledTimes(2));
      expect(latest("board").manageAvailability?.status).toBe("ready");
      expect(host.update).not.toHaveBeenCalled();
    },
  );
});

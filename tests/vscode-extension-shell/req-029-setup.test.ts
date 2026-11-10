import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activate } from "../../packages/extension/src/extension.js";
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
  "settings: {workdays_off: [mon], public_holidays: false}\nprojects: []\n";
let root: string;
let disposables: { dispose(): void }[];
beforeEach(async () => {
  resetHost();
  root = await fs.mkdtemp(join(tmpdir(), "gb-setup-"));
  disposables = [];
  host.path = join(root, "missing.yaml");
  activate({
    extensionUri: { fsPath: root },
    subscriptions: disposables,
  } as never);
  host.provider?.resolveWebviewView({ webview: webview("events"), show() {} });
  host.openBoard?.();
  await vi.waitFor(() =>
    expect(latest("board")).toMatchObject({
      manageAvailability: { status: "missing" },
    }),
  );
});
afterEach(async () => {
  for (const disposable of disposables) disposable.dispose();
  await fs.rm(root, { recursive: true, force: true });
});
for (const surface of ["board", "events"] as const) {
  describe(`REQ-029 ${surface}の設定操作`, () => {
    it("REQ-029-S04 既存ファイルの選択で両画面と監視が切り替わる", async () => {
      const path = join(root, "other.yaml");
      await fs.writeFile(path, valid);
      host.openDialog.mockResolvedValueOnce([{ fsPath: path }]);
      await host.receivers[surface]?.({ type: "chooseManage" });
      await vi.waitFor(() =>
        expect(latest("board")).toMatchObject({
          error: null,
          settings: { workdays_off: ["mon"] },
        }),
      );
      expect(latest("board")).toEqual(latest("events"));
      expect(host.path).toBe(path);
      expect(host.watchers[0]?.disposed).toBe(true);
      expect(await fs.readFile(path, "utf8")).toBe(valid);
    });
    it.each(["same", "other"])(
      "REQ-029-S05 %sパスの作成後に初期データを表示する",
      async (target) => {
        const path = target === "same" ? host.path : join(root, "new.yaml");
        host.saveDialog.mockResolvedValueOnce({ fsPath: path });
        await host.receivers[surface]?.({ type: "createManage" });
        await vi.waitFor(() =>
          expect(latest("board")).toMatchObject({
            error: null,
            manageAvailability: { status: "ready" },
            settings: { workdays_off: ["sat", "sun"], public_holidays: true },
            projects: [],
          }),
        );
        expect(latest("board")).toEqual(latest("events"));
        expect(host.path).toBe(path);
        expect(await fs.readFile(path, "utf8")).toBe(
          "settings:\n  workdays_off: [sat, sun]\n  public_holidays: true\nprojects: []\n",
        );
        expect(host.update).toHaveBeenCalledWith("manageFile", path, 1);
      },
    );
    it.each(["chooseManage", "createManage"])(
      "REQ-029-S06 %sの取消で設定とファイルを変えない",
      async (type) => {
        const previous = host.path;
        await host.receivers[surface]?.({ type });
        expect(host.path).toBe(previous);
        expect(host.update).not.toHaveBeenCalled();
        expect(await fs.readdir(root)).toEqual([]);
        expect(latest(surface)).toMatchObject({
          manageAvailability: { status: "missing" },
        });
        expect(host.messages[surface].at(-1)).toMatchObject({
          type: "operationResult",
          payload: { ok: true },
        });
      },
    );
    it.each(["exists", "permission"])(
      "REQ-029-S07 %sの作成失敗後も別のファイルを選べる",
      async (kind) => {
        const path = join(root, "existing.yaml");
        await fs.writeFile(path, valid);
        host.saveDialog.mockResolvedValueOnce({ fsPath: path });
        if (kind === "permission")
          vi.mocked(fs.writeFile).mockRejectedValueOnce(
            Object.assign(new Error("permission denied"), { code: "EACCES" }),
          );
        await host.receivers[surface]?.({ type: "createManage" });
        expect(host.messages[surface].at(-1)).toMatchObject({
          type: "operationResult",
          payload: { ok: false, error: expect.any(String) },
        });
        expect(host.update).not.toHaveBeenCalled();
        expect(await fs.readFile(path, "utf8")).toBe(valid);
        expect(latest(surface)).toMatchObject({
          manageAvailability: { status: "missing" },
        });
        host.openDialog.mockResolvedValueOnce([{ fsPath: path }]);
        await host.receivers[surface]?.({ type: "chooseManage" });
        await vi.waitFor(() =>
          expect(latest(surface)).toMatchObject({
            error: null,
            manageAvailability: { status: "ready" },
          }),
        );
      },
    );
  });
}

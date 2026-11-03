import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

type Message = {
  type: string;
  payload?: { settings?: { workdays_off: string[] } };
};
const state = vi.hoisted(() => ({
  managePath: "",
  configListener: null as
    | null
    | ((event: { affectsConfiguration(key: string): boolean }) => void),
  viewProvider: null as null | { resolveWebviewView(view: unknown): void },
  sidebarReceiver: null as null | ((message: unknown) => Promise<void>),
  saveDialogCalls: 0,
  openBoard: null as null | (() => void),
  watchers: [] as { disposed: boolean }[],
  sidebarMessages: [] as Message[],
  boardMessages: [] as Message[],
}));

vi.mock("vscode", () => {
  const uri = (path: string) => ({ fsPath: path, toString: () => path });
  const webview = (messages: Message[]) => ({
    options: {},
    html: "",
    cspSource: "vscode-resource:",
    asWebviewUri: (target: { toString(): string }) => target,
    postMessage: async (message: Message) => {
      messages.push(message);
      return true;
    },
    onDidReceiveMessage: () => ({ dispose() {} }),
  });
  return {
    RelativePattern: class {
      constructor(
        readonly base: string,
        readonly pattern: string,
      ) {}
    },
    Uri: {
      joinPath: (base: { fsPath: string }, ...parts: string[]) =>
        uri([base.fsPath, ...parts].join("/")),
      file: uri,
    },
    ViewColumn: { One: 1 },
    ConfigurationTarget: { Workspace: 1, Global: 2 },
    workspace: {
      workspaceFolders: [{ uri: uri("/workspace") }],
      getConfiguration: () => ({
        get: () => state.managePath,
        update: async () => {},
      }),
      onDidChangeConfiguration: (listener: typeof state.configListener) => {
        state.configListener = listener;
        return { dispose() {} };
      },
      createFileSystemWatcher: () => {
        const watcher = {
          disposed: false,
          dispose() {
            this.disposed = true;
          },
          onDidChange() {},
          onDidCreate() {},
          onDidDelete() {},
        };
        state.watchers.push(watcher);
        return watcher;
      },
    },
    window: {
      showSaveDialog: async () => {
        state.saveDialogCalls++;
        return undefined;
      },
      registerWebviewViewProvider: (
        _id: string,
        provider: typeof state.viewProvider,
      ) => {
        state.viewProvider = provider;
        return { dispose() {} };
      },
      createWebviewPanel: () => ({
        webview: webview(state.boardMessages),
        reveal() {},
        onDidDispose() {},
      }),
    },
    commands: {
      registerCommand: (_id: string, callback: () => void) => {
        state.openBoard = callback;
        return { dispose() {} };
      },
    },
  };
});

import { activate } from "../../packages/extension/src/extension.js";

describe("REQ-013-S03 管理ファイルの切り替え", () => {
  it("設定変更で両画面と監視対象を再起動なしで切り替える", async () => {
    const root = await mkdtemp(join(tmpdir(), "glitchboard-switch-"));
    const first = join(root, "first");
    const second = join(root, "second");
    await mkdir(first);
    await mkdir(second);
    const a = join(first, "manage.yaml");
    const b = join(second, "manage.yaml");
    await writeFile(
      a,
      "settings: {workdays_off: [sun], public_holidays: false}\nprojects: []\n",
    );
    await writeFile(
      b,
      "settings: {workdays_off: [mon], public_holidays: false}\nprojects: []\n",
    );
    state.managePath = a;
    activate({ extensionUri: { fsPath: root }, subscriptions: [] } as never);
    state.viewProvider?.resolveWebviewView({
      webview: {
        options: {},
        html: "",
        cspSource: "vscode-resource:",
        asWebviewUri: (target: { toString(): string }) => target,
        postMessage: async (message: Message) => {
          state.sidebarMessages.push(message);
          return true;
        },
        onDidReceiveMessage: (
          receiver: (message: unknown) => Promise<void>,
        ) => {
          state.sidebarReceiver = receiver;
          return { dispose() {} };
        },
      },
      show() {},
    });
    state.openBoard?.();
    await vi.waitFor(() =>
      expect(
        state.sidebarMessages.some(
          (message) => message.payload?.settings?.workdays_off[0] === "sun",
        ),
      ).toBe(true),
    );
    state.managePath = b;
    state.configListener?.({
      affectsConfiguration: (key) => key === "glitchboard.manageFile",
    });
    await vi.waitFor(() => {
      expect(
        state.sidebarMessages.at(-1)?.payload?.settings?.workdays_off,
      ).toEqual(["mon"]);
      expect(
        state.boardMessages.at(-1)?.payload?.settings?.workdays_off,
      ).toEqual(["mon"]);
    });
    expect(state.watchers).toHaveLength(2);
    expect(state.watchers[0]?.disposed).toBe(true);
    expect(state.watchers[1]?.disposed).toBe(false);
    await state.sidebarReceiver?.({ type: "createManage", extra: true });
    expect(state.saveDialogCalls).toBe(0);
    expect(state.sidebarMessages.at(-1)).toMatchObject({
      type: "operationResult",
      payload: { ok: false },
    });
  });
});

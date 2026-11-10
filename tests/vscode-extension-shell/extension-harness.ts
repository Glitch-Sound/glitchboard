import { vi } from "vitest";
import { snapshotMessageSchema } from "../../packages/shared/src/domain/messages.js";

type Receiver = (message: unknown) => Promise<void>;
type Message = { type: string; payload?: unknown };
const host = vi.hoisted(() => ({
  path: "",
  config: null as
    | null
    | ((event: { affectsConfiguration(key: string): boolean }) => void),
  provider: null as null | { resolveWebviewView(view: unknown): void },
  openBoard: null as null | (() => void),
  receivers: {} as Record<string, Receiver>,
  messages: { board: [] as Message[], events: [] as Message[] },
  watchers: [] as {
    change?: () => void;
    create?: () => void;
    delete?: () => void;
    disposed: boolean;
  }[],
  openDialog: vi.fn(),
  saveDialog: vi.fn(),
  update: vi.fn(),
}));

export function webview(surface: "board" | "events") {
  return {
    options: {},
    html: "",
    cspSource: "vscode-resource:",
    asWebviewUri: (target: unknown) => target,
    postMessage: async (message: Message) => {
      host.messages[surface].push(message);
      return true;
    },
    onDidReceiveMessage: (receiver: Receiver) => {
      host.receivers[surface] = receiver;
      return { dispose() {} };
    },
  };
}

export function vscodeMock() {
  return {
    RelativePattern: class {
      constructor(
        readonly base: string,
        readonly pattern: string,
      ) {}
    },
    Uri: {
      joinPath: (base: { fsPath: string }, ...parts: string[]) => ({
        fsPath: [base.fsPath, ...parts].join("/"),
      }),
    },
    ViewColumn: { One: 1 },
    ConfigurationTarget: { Workspace: 1, Global: 2 },
    workspace: {
      workspaceFolders: [{ uri: { fsPath: "/workspace" } }],
      getConfiguration: () => ({ get: () => host.path, update: host.update }),
      onDidChangeConfiguration: (callback: typeof host.config) => {
        host.config = callback;
        return { dispose() {} };
      },
      createFileSystemWatcher: () => {
        const watcher = {
          disposed: false,
          change: undefined as undefined | (() => void),
          create: undefined as undefined | (() => void),
          delete: undefined as undefined | (() => void),
          dispose() {
            this.disposed = true;
          },
          onDidChange(callback: () => void) {
            this.change = callback;
          },
          onDidCreate(callback: () => void) {
            this.create = callback;
          },
          onDidDelete(callback: () => void) {
            this.delete = callback;
          },
        };
        host.watchers.push(watcher);
        return watcher;
      },
    },
    window: {
      showOpenDialog: host.openDialog,
      showSaveDialog: host.saveDialog,
      registerWebviewViewProvider: (
        _id: string,
        provider: typeof host.provider,
      ) => {
        host.provider = provider;
        return { dispose() {} };
      },
      createWebviewPanel: () => ({
        webview: webview("board"),
        reveal() {},
        onDidDispose() {},
      }),
    },
    commands: {
      registerCommand: (_id: string, callback: () => void) => {
        host.openBoard = callback;
        return { dispose() {} };
      },
    },
  };
}

export function latest(surface: "board" | "events") {
  const message = [...host.messages[surface]]
    .reverse()
    .find((message) => message.type === "snapshot");
  return snapshotMessageSchema.parse(message).payload;
}

export function resetHost() {
  host.path = "";
  host.config = null;
  host.provider = null;
  host.openBoard = null;
  host.receivers = {};
  host.messages.board = [];
  host.messages.events = [];
  host.watchers = [];
  host.openDialog.mockReset();
  host.saveDialog.mockReset();
  host.update.mockReset();
  host.update.mockImplementation(async (_key: string, path: string) => {
    const changed = host.path !== path;
    host.path = path;
    if (changed) host.config?.({ affectsConfiguration: () => true });
  });
}

export { host };

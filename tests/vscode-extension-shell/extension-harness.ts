import { vi } from "vitest";
import { snapshotMessageSchema } from "../../packages/shared/src/domain/messages.js";

type Receiver = (message: unknown) => Promise<void>;
type Message = { type: string; payload?: unknown };
const host = vi.hoisted(() => ({
  path: "",
  workspacePath: "/workspace",
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
    base: string;
    pattern: string;
  }[],
  openDialog: vi.fn(),
  saveDialog: vi.fn(),
  update: vi.fn(),
  executeCommand: vi.fn(),
  createPanel: vi.fn(),
  revealPanel: vi.fn(),
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
    ConfigurationTarget: { Workspace: 2, Global: 1 },
    workspace: {
      get workspaceFolders() {
        return [{ uri: { fsPath: host.workspacePath } }];
      },
      getConfiguration: () => ({ get: () => host.path, update: host.update }),
      onDidChangeConfiguration: (callback: typeof host.config) => {
        host.config = callback;
        return { dispose() {} };
      },
      createFileSystemWatcher: (pattern: { base: string; pattern: string }) => {
        const watcher = {
          base: pattern.base,
          pattern: pattern.pattern,
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
      createWebviewPanel: () => {
        host.createPanel();
        return {
          webview: webview("board"),
          reveal: host.revealPanel,
          onDidDispose() {},
        };
      },
    },
    commands: {
      executeCommand: host.executeCommand,
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
  host.workspacePath = "/workspace";
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
  host.executeCommand.mockReset();
  host.createPanel.mockReset();
  host.revealPanel.mockReset();
  host.executeCommand.mockImplementation(async (id: string) => {
    if (id === "glitchboard.open") host.openBoard?.();
  });
  host.update.mockImplementation(async (_key: string, path: string) => {
    const changed = host.path !== path;
    host.path = path;
    if (changed) host.config?.({ affectsConfiguration: () => true });
  });
}

export { host };

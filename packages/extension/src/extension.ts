import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import * as vscode from "vscode";
import {
  connectionChangeResultSchema,
  navigationMessageSchema,
  operationConnectionSchema,
  operationSchema,
  setupOperationSchema,
} from "../../shared/src/domain/messages.js";
import { BoardSession } from "./session.js";
import { registerViews } from "./views.js";

/** REQ-012: VS CodeにEVENT一覧とボードを公開する。 */
export function activate(context: vscode.ExtensionContext): void {
  let sidebar: vscode.WebviewView | undefined;
  let board: vscode.WebviewPanel | undefined;
  let session: BoardSession | undefined;
  let lastSession: BoardSession | undefined;
  let connectionRequestId = 0;
  let settlingConnection: number | undefined;
  const finishConnectionChange = () => {
    if (settlingConnection === undefined) return;
    void board?.webview.postMessage({
      type: "connectionChangeSettled",
      requestId: settlingConnection,
    });
    settlingConnection = undefined;
  };
  let connectionChange:
    | { id: number; source: BoardSession; resolve(ok: boolean): void }
    | undefined;
  const snapshotMessage = (
    current: BoardSession,
    snapshot = current.snapshot(),
  ) => ({
    type: "snapshot",
    payload: { ...snapshot, connectionId: current.managePath },
  });
  const configuredPath = () => {
    const value = vscode.workspace
      .getConfiguration("glitchboard")
      .get<string>("manageFile");
    return value ? resolve(value) : undefined;
  };
  let boardReady = false;
  let pendingNavigation:
    | ReturnType<typeof navigationMessageSchema.parse>
    | undefined;
  const deliverNavigation = async () => {
    if (boardReady && board && pendingNavigation) {
      const message = pendingNavigation;
      pendingNavigation = undefined;
      await board.webview.postMessage(message);
    }
  };
  let watcher: vscode.FileSystemWatcher | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let configurationReady: Promise<void> = Promise.resolve();
  let interruptReload: (() => void) | undefined;
  const canOpenBoard = () =>
    session?.snapshot().manageAvailability?.status === "ready";
  const waitForConfiguration = async () => {
    let pending: Promise<void>;
    do {
      pending = configurationReady;
      await pending;
    } while (pending !== configurationReady);
  };
  const prepareBoard = async () => {
    for (;;) {
      await waitForConfiguration();
      const current = session;
      if (!current) return;
      // 監視の遅延中も、起動直前の削除と復元を現在の読込結果で判定する。
      await current.reload();
      if (current === session) return;
    }
  };
  const requestConnectionChange = async (target: string) => {
    if (
      !lastSession ||
      lastSession.managePath === target ||
      !board ||
      !boardReady
    )
      return true;
    const currentBoard = board;
    currentBoard.reveal();
    const source = lastSession;
    const id = ++connectionRequestId;
    return new Promise<boolean>((done) => {
      connectionChange = { id, source, resolve: done };
      void currentBoard.webview.postMessage({
        type: "prepareConnectionChange",
        requestId: id,
      });
    })
      .then((accepted) => {
        if (accepted) settlingConnection = id;
        return accepted;
      })
      .finally(() => {
        connectionChange = undefined;
      });
  };
  const configureConnection = async (approved = false) => {
    const managePath = configuredPath();
    const previousPath = session?.managePath;
    if (
      managePath &&
      !approved &&
      lastSession &&
      lastSession.managePath !== managePath &&
      board &&
      boardReady
    ) {
      const accepted = await requestConnectionChange(managePath);
      if (configuredPath() !== managePath) return;
      if (!accepted) {
        await vscode.workspace
          .getConfiguration("glitchboard")
          .update(
            "manageFile",
            previousPath,
            vscode.ConfigurationTarget.Global,
          );
        return;
      }
    }
    watcher?.dispose();
    if (timer) clearTimeout(timer);
    session = managePath
      ? lastSession?.managePath === managePath
        ? lastSession
        : new BoardSession(managePath)
      : undefined;
    if (session) {
      const current = session;
      if (current !== lastSession) {
        pendingNavigation = undefined;
        lastSession = current;
        current.subscribe("board", (snapshot) => {
          if (session === current || connectionChange?.source === current) {
            void board?.webview.postMessage(snapshotMessage(current, snapshot));
            if (session !== current)
              void board?.webview.postMessage({ type: "unconfigured" });
          }
        });
        current.subscribe("events", (snapshot) => {
          if (session === current)
            void sidebar?.webview.postMessage(
              snapshotMessage(current, snapshot),
            );
        });
      }
      watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(
          dirname(current.managePath),
          "**/*.{yaml,yml}",
        ),
      );
      const schedule = () => {
        if (session !== current) return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          if (session === current) void current.reload();
        }, 80);
      };
      watcher.onDidChange(schedule);
      watcher.onDidCreate(schedule);
      watcher.onDidDelete(schedule);
      // 新しい設定は、古いファイルの遅い読込完了を待たずに判定する。
      let interrupted!: () => void;
      const superseded = new Promise<void>((done) => {
        interrupted = done;
        interruptReload = done;
      });
      await Promise.race([current.reload(), superseded]);
      if (interruptReload === interrupted) interruptReload = undefined;
    } else {
      void board?.webview.postMessage({ type: "unconfigured" });
      void sidebar?.webview.postMessage({ type: "unconfigured" });
    }
  };
  const configure = async (approved = false) => {
    try {
      await configureConnection(approved);
    } finally {
      finishConnectionChange();
    }
  };
  const enqueueConfiguration = <T>(action: () => Promise<T>): Promise<T> => {
    const result = configurationReady.then(action);
    configurationReady = result.then(
      () => {},
      () => {},
    );
    return result;
  };
  const reportConfigurationError = (error: unknown) => {
    const message = {
      type: "operationResult",
      payload: {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
    };
    void board?.webview.postMessage(message);
    void sidebar?.webview.postMessage(message);
  };
  const reconnect = () => {
    interruptReload?.();
    return enqueueConfiguration(() => configure()).catch(
      reportConfigurationError,
    );
  };
  configurationReady = configure().catch(reportConfigurationError);
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("glitchboard.manageFile"))
        void reconnect();
    }),
  );
  context.subscriptions.push({
    dispose: () => {
      connectionChange?.resolve(false);
      interruptReload?.();
      watcher?.dispose();
      if (timer) clearTimeout(timer);
    },
  });
  /** REQ-029: 作成・選択後に接続し、同じ設定先の作成でも再読込する。 */
  const setupManage = async (
    type: string,
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      const selected =
        type === "chooseManage"
          ? (
              await vscode.window.showOpenDialog({
                canSelectMany: false,
                filters: { YAML: ["yaml", "yml"] },
              })
            )?.[0]
          : await vscode.window.showSaveDialog({
              defaultUri:
                vscode.workspace.workspaceFolders?.[0] &&
                vscode.Uri.joinPath(
                  vscode.workspace.workspaceFolders[0].uri,
                  "manage.yaml",
                ),
              filters: { YAML: ["yaml"] },
            });
      if (!selected) return { ok: true };
      const changed = await enqueueConfiguration(async () => {
        try {
          const target = resolve(selected.fsPath);
          const previousPath = configuredPath();
          if (!(await requestConnectionChange(target))) return false;
          if (configuredPath() !== previousPath) return false;
          if (type === "createManage")
            await writeFile(
              target,
              "settings:\n  workdays_off: [sat, sun]\n  public_holidays: true\nprojects: []\n",
              { flag: "wx" },
            );
          await vscode.workspace
            .getConfiguration("glitchboard")
            .update("manageFile", target, vscode.ConfigurationTarget.Global);
          await configure(true);
          return true;
        } finally {
          finishConnectionChange();
        }
      });
      if (changed && canOpenBoard())
        await vscode.commands.executeCommand("glitchboard.open");
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };
  const operationConnectionError = (
    message: unknown,
    current: BoardSession,
  ) => {
    const parsed = operationConnectionSchema.safeParse(message);
    if (!parsed.success) return parsed.error.message;
    if (
      parsed.data.connectionId &&
      parsed.data.connectionId !== current.managePath
    )
      return "管理ファイルの接続先が変わったため操作できません。";
    return undefined;
  };
  const isSetup = (
    message: unknown,
  ): message is { type: string; requestId?: number } =>
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    (message.type === "chooseManage" || message.type === "createManage");
  const handleSetup = async (message: unknown) => {
    const parsed = setupOperationSchema.safeParse(message);
    if (!parsed.success) return { ok: false, error: parsed.error.message };
    return setupManage(parsed.data.type);
  };
  registerViews({
    registerSidebar: (id) => {
      context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(id, {
          resolveWebviewView(view) {
            sidebar = view;
            const showBoard = async () => {
              if (sidebar === view && view.visible !== false)
                await vscode.commands.executeCommand("glitchboard.open");
            };
            const visibility = view.onDidChangeVisibility?.(() => {
              void showBoard();
            });
            if (visibility) context.subscriptions.push(visibility);
            // 初回の不在判定を待ち、未設定時の案内は左だけに集める。
            void showBoard();
            view.webview.options = {
              enableScripts: true,
              localResourceRoots: [context.extensionUri],
            };
            view.webview.html = webviewHtml(
              view.webview,
              context.extensionUri,
              "events",
            );
            if (session)
              void view.webview.postMessage(snapshotMessage(session));
            else void view.webview.postMessage({ type: "unconfigured" });
            view.webview.onDidReceiveMessage(
              async (message: unknown) => {
                if (isSetup(message)) {
                  const result = await handleSetup(message);
                  await view.webview.postMessage({
                    type: "operationResult",
                    payload: result,
                    requestId: message.requestId,
                  });
                  return;
                }
                if (
                  typeof message === "object" &&
                  message !== null &&
                  "type" in message &&
                  message.type === "ready"
                ) {
                  await view.webview.postMessage(
                    session
                      ? snapshotMessage(session)
                      : { type: "unconfigured" },
                  );
                  return;
                }
                if (!session) {
                  await view.webview.postMessage({
                    type: "operationResult",
                    payload: { ok: false, error: "manage.yamlが未設定" },
                    requestId:
                      typeof message === "object" &&
                      message !== null &&
                      "requestId" in message
                        ? message.requestId
                        : undefined,
                  });
                  return;
                }
                const currentSession = session;
                let result: { ok: boolean; error?: string };
                const connectionError = operationConnectionError(
                  message,
                  currentSession,
                );
                if (connectionError)
                  result = { ok: false, error: connectionError };
                else if (
                  typeof message === "object" &&
                  message !== null &&
                  "type" in message &&
                  message.type === "selectEvent" &&
                  "eventId" in message &&
                  typeof message.eventId === "string"
                ) {
                  try {
                    const parsed = operationSchema.parse(message);
                    if (parsed.type !== "selectEvent")
                      throw new Error("移動要求が無効");
                    pendingNavigation = navigationMessageSchema.parse({
                      type: "navigateRecord",
                      payload: {
                        kind: "event",
                        ...(operationConnectionSchema.parse(message)
                          .connectionId
                          ? { connectionId: currentSession.managePath }
                          : {}),
                        id: parsed.eventId,
                        projectFile: parsed.projectFile,
                        openDetail: parsed.openDetail ?? false,
                      },
                    });
                    await vscode.commands.executeCommand("glitchboard.open");
                    await deliverNavigation();
                    result = { ok: true };
                  } catch (error) {
                    result = {
                      ok: false,
                      error:
                        error instanceof Error ? error.message : String(error),
                    };
                  }
                } else result = await currentSession.handleOperation(message);
                await view.webview.postMessage({
                  type: "operationResult",
                  payload: result,
                  requestId:
                    typeof message === "object" &&
                    message !== null &&
                    "requestId" in message
                      ? message.requestId
                      : undefined,
                });
              },
              undefined,
              context.subscriptions,
            );
          },
        }),
      );
    },
    registerCommand: (id, callback) => {
      context.subscriptions.push(vscode.commands.registerCommand(id, callback));
    },
    openEditor: async () => {
      await prepareBoard();
      if (!canOpenBoard()) {
        if (sidebar?.show) sidebar.show(false);
        else await vscode.commands.executeCommand("glitchboard.events.focus");
        return;
      }
      if (board) {
        board.reveal();
        sidebar?.show?.(true);
        return;
      }
      boardReady = false;
      board = vscode.window.createWebviewPanel(
        "glitchboard.board",
        "GlitchBoard",
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [context.extensionUri],
        },
      );
      board.webview.html = webviewHtml(
        board.webview,
        context.extensionUri,
        "board",
      );
      if (session) void board.webview.postMessage(snapshotMessage(session));
      else void board.webview.postMessage({ type: "unconfigured" });
      board.webview.onDidReceiveMessage(
        async (message: unknown) => {
          const connectionResult =
            connectionChangeResultSchema.safeParse(message);
          if (connectionResult.success) {
            if (connectionChange?.id === connectionResult.data.requestId)
              connectionChange.resolve(connectionResult.data.ok);
            return;
          }
          if (isSetup(message)) {
            const result = await handleSetup(message);
            await board?.webview.postMessage({
              type: "operationResult",
              payload: result,
              requestId: message.requestId,
            });
            return;
          }
          if (
            typeof message === "object" &&
            message !== null &&
            "type" in message &&
            message.type === "ready"
          ) {
            boardReady = true;
            await board?.webview.postMessage(
              session ? snapshotMessage(session) : { type: "unconfigured" },
            );
            await deliverNavigation();
            return;
          }
          const operationSession = session ?? connectionChange?.source;
          if (!operationSession) {
            await board?.webview.postMessage({
              type: "operationResult",
              payload: { ok: false, error: "manage.yamlが未設定" },
              requestId:
                typeof message === "object" &&
                message !== null &&
                "requestId" in message
                  ? message.requestId
                  : undefined,
            });
            return;
          }
          const connectionError = operationConnectionError(
            message,
            operationSession,
          );
          const result = connectionError
            ? { ok: false, error: connectionError }
            : await operationSession.handleOperation(message);
          await board?.webview.postMessage({
            type: "operationResult",
            payload: result,
            requestId:
              typeof message === "object" &&
              message !== null &&
              "requestId" in message
                ? message.requestId
                : undefined,
          });
        },
        undefined,
        context.subscriptions,
      );
      board.onDidDispose(() => {
        connectionChange?.resolve(false);
        board = undefined;
        boardReady = false;
      });
      if (sidebar?.show) sidebar.show(true);
      else await vscode.commands.executeCommand("glitchboard.events.focus");
    },
  });
}

export function deactivate(): void {}

function webviewHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  surface: "events" | "board",
): string {
  const nonce = Math.random().toString(36).slice(2);
  const script = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "dist", "webview", `${surface}.js`),
  );
  const style = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "dist", "webview", "style.css"),
  );
  return `<!doctype html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}' ${webview.cspSource};"><link rel="stylesheet" href="${style}"></head><body data-surface="${surface}"><div id="root"></div><script type="module" nonce="${nonce}" src="${script}"></script></body></html>`;
}

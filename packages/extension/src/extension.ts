import { dirname } from "node:path";
import * as vscode from "vscode";
import { openLinkRequestSchema } from "../../shared/src/domain/messages.js";
import { openLinkedTarget } from "./links.js";
import { navigateToEvent } from "./navigation.js";
import { BoardSession } from "./session.js";
import { registerViews } from "./views.js";

/** REQ-012: VS CodeにEVENT一覧とボードを公開する。 */
export function activate(context: vscode.ExtensionContext): void {
  let sidebar: vscode.WebviewView | undefined;
  let board: vscode.WebviewPanel | undefined;
  const managePath = vscode.workspace
    .getConfiguration("glitchboard")
    .get<string>("manageFile");
  const session = managePath ? new BoardSession(managePath) : undefined;
  const openLink = async (
    message: unknown,
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!session) return { ok: false, error: "manage.yamlが未設定" };
    const parsed = openLinkRequestSchema.safeParse(message);
    if (!parsed.success) return { ok: false, error: parsed.error.message };
    try {
      await openLinkedTarget(
        session.managePath,
        parsed.data.target,
        async (path) => {
          await vscode.window.showTextDocument(
            await vscode.workspace.openTextDocument(vscode.Uri.file(path)),
          );
        },
        async (url) => {
          await vscode.env.openExternal(vscode.Uri.parse(url));
        },
      );
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };
  if (session) {
    void session.reload();
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(dirname(session.managePath), "**/*.yaml"),
    );
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void session.reload();
      }, 80);
    };
    context.subscriptions.push(watcher);
    watcher.onDidChange(schedule, undefined, context.subscriptions);
    watcher.onDidCreate(schedule, undefined, context.subscriptions);
    watcher.onDidDelete(schedule, undefined, context.subscriptions);
    context.subscriptions.push({
      dispose: () => {
        if (timer) clearTimeout(timer);
      },
    });
    session.subscribe("board", (snapshot) => {
      void board?.webview.postMessage({ type: "snapshot", payload: snapshot });
    });
    session.subscribe("events", (snapshot) => {
      void sidebar?.webview.postMessage({
        type: "snapshot",
        payload: snapshot,
      });
    });
  }
  registerViews({
    registerSidebar: (id) => {
      context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(id, {
          resolveWebviewView(view) {
            sidebar = view;
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
              void view.webview.postMessage({
                type: "snapshot",
                payload: session.snapshot(),
              });
            view.webview.onDidReceiveMessage(
              async (message: unknown) => {
                if (!session) return;
                if (
                  typeof message === "object" &&
                  message !== null &&
                  "type" in message &&
                  message.type === "ready"
                ) {
                  await view.webview.postMessage({
                    type: "snapshot",
                    payload: session.snapshot(),
                  });
                  return;
                }
                let result: { ok: boolean; error?: string };
                if (
                  typeof message === "object" &&
                  message !== null &&
                  "type" in message &&
                  message.type === "selectEvent" &&
                  "eventId" in message &&
                  typeof message.eventId === "string"
                ) {
                  try {
                    await navigateToEvent(message.eventId, {
                      selectEvent: (eventId) =>
                        session.handleOperation({
                          type: "selectEvent",
                          eventId,
                        }),
                      openBoard: async () => {
                        await vscode.commands.executeCommand(
                          "glitchboard.open",
                        );
                      },
                    });
                    result = { ok: true };
                  } catch (error) {
                    result = {
                      ok: false,
                      error:
                        error instanceof Error ? error.message : String(error),
                    };
                  }
                } else result = await session.handleOperation(message);
                await view.webview.postMessage({
                  type: "operationResult",
                  payload: result,
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
    openEditor: () => {
      if (board) {
        board.reveal();
        return;
      }
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
      if (session)
        void board.webview.postMessage({
          type: "snapshot",
          payload: session.snapshot(),
        });
      board.webview.onDidReceiveMessage(
        async (message: unknown) => {
          if (!session) return;
          if (
            typeof message === "object" &&
            message !== null &&
            "type" in message &&
            message.type === "ready"
          ) {
            await board?.webview.postMessage({
              type: "snapshot",
              payload: session.snapshot(),
            });
            return;
          }
          const result =
            typeof message === "object" &&
            message !== null &&
            "type" in message &&
            message.type === "openLink"
              ? await openLink(message)
              : await session.handleOperation(message);
          await board?.webview.postMessage({
            type: "operationResult",
            payload: result,
          });
        },
        undefined,
        context.subscriptions,
      );
      board.onDidDispose(() => {
        board = undefined;
      });
      sidebar?.show?.(true);
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

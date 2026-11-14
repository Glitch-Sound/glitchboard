import { expect, it, vi } from "vitest";
import { activate } from "../../packages/extension/src/extension.js";
import { host, resetHost, webview } from "./extension-harness.js";

vi.mock("vscode", async () =>
  (await import("./extension-harness.js")).vscodeMock(),
);
it("REQ-012-S02 メニューの解決と再表示でメインパネルを1つだけ開く", async () => {
  resetHost();
  const subscriptions: { dispose(): void }[] = [];
  activate({ extensionUri: { fsPath: "/extension" }, subscriptions } as never);
  let visibility: (() => void) | undefined;
  host.provider?.resolveWebviewView({
    webview: webview("events"),
    visible: true,
    onDidChangeVisibility(callback: () => void) {
      visibility = callback;
      return { dispose() {} };
    },
  });
  await vi.waitFor(() =>
    expect(host.executeCommand).toHaveBeenCalledWith("glitchboard.open"),
  );
  expect(host.receivers.board).toBeTypeOf("function");
  visibility?.();
  visibility?.();
  expect(host.createPanel).toHaveBeenCalledTimes(1);
  expect(host.revealPanel).toHaveBeenCalledTimes(2);
  subscriptions.forEach((d) => {
    d.dispose();
  });
});

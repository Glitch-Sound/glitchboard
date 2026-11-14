import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { activate } from "../../packages/extension/src/extension.js";
import { host, latest, resetHost, webview } from "./extension-harness.js";

vi.mock("vscode", async () =>
  (await import("./extension-harness.js")).vscodeMock(),
);
it("REQ-005-S05 サイドバーの実ハンドラはProject参照を落とさずボードへ渡す", async () => {
  resetHost();
  const root = await mkdtemp(join(tmpdir(), "gb-scope-shell-"));
  const disposables: { dispose(): void }[] = [];
  const eventId = "22222222-2222-4222-8222-222222222222";
  try {
    for (const name of ["A", "B"])
      await writeFile(
        join(root, `${name}.yaml`),
        JSON.stringify({
          id: "11111111-1111-4111-8111-111111111111",
          name,
          color: "#123456",
          events: [
            {
              id: eventId,
              name: `${name} Event`,
              due: "2099-01-01",
              tasks: [],
              stories: [],
            },
          ],
        }),
      );
    host.path = join(root, "manage.yaml");
    await writeFile(
      host.path,
      JSON.stringify({
        settings: { workdays_off: [], public_holidays: false },
        projects: [
          { file: "A.yaml", load: true },
          { file: "B.yaml", load: true },
        ],
      }),
    );
    activate({
      extensionUri: { fsPath: root },
      subscriptions: disposables,
    } as never);
    host.provider?.resolveWebviewView({ webview: webview("events") });
    host.openBoard?.();
    await vi.waitFor(() => expect(latest("board").projects).toHaveLength(2));
    await host.receivers.events?.({
      type: "selectEvent",
      eventId,
      projectFile: "A.yaml",
    });
    expect(
      host.messages.board.filter((m) => m.type === "navigateRecord"),
    ).toHaveLength(0);
    await host.receivers.events?.({
      type: "selectEvent",
      eventId,
      projectFile: "B.yaml",
    });
    // 移動はボードの編集保護を経てから確定する。
    await host.receivers.board?.({ type: "ready" });
    const navigation = [...host.messages.board]
      .reverse()
      .find((m) => m.type === "navigateRecord");
    expect(
      host.messages.board.filter((m) => m.type === "navigateRecord"),
    ).toHaveLength(1);
    expect(navigation).toEqual({
      type: "navigateRecord",
      payload: {
        kind: "event",
        id: eventId,
        projectFile: "B.yaml",
        openDetail: false,
      },
    });
    expect(latest("board").selectedProjectFile).toBe("A.yaml");
    await host.receivers.board?.({
      type: "selectEvent",
      eventId,
      projectFile: "B.yaml",
    });
    expect(latest("board")).toMatchObject({
      selectedEventId: eventId,
      selectedProjectFile: "B.yaml",
    });
    expect(latest("events")).toEqual(latest("board"));
    expect(host.executeCommand).toHaveBeenCalledWith("glitchboard.open");
    // REQ-035-S05: ボードの解除要求は移動要求へ変換せず、左右へ反映する。
    await host.receivers.board?.({ type: "selectEvent", eventId: null });
    expect(latest("board")).toMatchObject({
      selectedEventId: null,
      selectedProjectFile: null,
    });
    expect(latest("events")).toEqual(latest("board"));
  } finally {
    disposables.forEach((d) => {
      d.dispose();
    });
    await rm(root, { recursive: true, force: true });
  }
});

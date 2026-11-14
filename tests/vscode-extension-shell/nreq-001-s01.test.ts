import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { BoardSession } from "../../packages/extension/src/session.js";
import { postTaskPoints } from "../../packages/webview/src/app/operations.js";

describe("NREQ-001-S01 ネットワーク遮断", () => {
  it("Webviewの編集要求をローカルYAMLへ保存し外部要求しない", async () => {
    const root = await mkdtemp(join(tmpdir(), "glitchboard-offline-"));
    const project = join(root, "project.yaml");
    const manage = join(root, "manage.yaml");
    await writeFile(
      manage,
      "settings: {workdays_off: [], public_holidays: false}\nprojects: [{file: project.yaml, load: true}]\n",
    );
    await writeFile(
      project,
      "id: 22222222-2222-4222-8222-222222222222\nname: Alpha\ncolor: '#123456'\nevents:\n  - id: 33333333-3333-4333-8333-333333333333\n    name: Launch\n    due: 2026-11-10\n    stories:\n      - id: 44444444-4444-4444-8444-444444444444\n        name: Work\n        tasks:\n          - id: 55555555-5555-4555-8555-555555555555\n            name: Code\n",
    );
    const session = new BoardSession(manage);
    await session.reload();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("offline"));
    try {
      let message: unknown;
      postTaskPoints(
        {
          postMessage: (value) => {
            message = value;
          },
        },
        "55555555-5555-4555-8555-555555555555",
        5,
      );
      const result = await session.handleOperation(message);
      expect(result.ok).toBe(true);
      expect(await readFile(project, "utf8")).toContain("points: 5");
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});

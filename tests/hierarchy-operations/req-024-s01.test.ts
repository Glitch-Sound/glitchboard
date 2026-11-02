import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BoardSession } from "../../packages/extension/src/session.js";
import { eventPoints } from "../../packages/shared/src/domain/index.js";

afterEach(() => vi.useRealTimers());

describe("REQ-024-S01 完了と解除", () => {
  it("日本時間の当日を保存し残りポイントから外す", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-02T15:30:00Z"));
    const root = await mkdtemp(join(tmpdir(), "glitchboard-done-"));
    const path = join(root, "project.yaml");
    const manage = join(root, "manage.yaml");
    const taskId = "44444444-4444-4444-8444-444444444444";
    await writeFile(
      manage,
      "settings: {workdays_off: [sat, sun], public_holidays: false}\nprojects: [{file: project.yaml, load: true}]\n",
    );
    await writeFile(
      path,
      `id: 11111111-1111-4111-8111-111111111111\nname: Alpha\ncolor: '#123456'\nevents:\n  - id: 22222222-2222-4222-8222-222222222222\n    name: Launch\n    due: 2026-11-20\n    stories:\n      - id: 33333333-3333-4333-8333-333333333333\n        name: Work\n        tasks:\n          - id: ${taskId}\n            name: Finish\n            points: 8\n`,
    );
    const session = new BoardSession(manage);
    await session.reload();
    expect(
      await session.handleOperation({
        type: "setTaskDone",
        taskId,
        done: true,
      }),
    ).toEqual({ ok: true });
    const event = session.snapshot().projects[0]?.events[0];
    const task = event?.stories[0]?.tasks[0];
    if (!event || !task) throw new Error("更新後のTaskが見つからない");
    expect(task.doneAt).toBe("2026-11-03");
    expect(eventPoints(event).done).toBe(8);
    expect(await readFile(path, "utf8")).toContain("doneAt: 2026-11-03");
  });
});

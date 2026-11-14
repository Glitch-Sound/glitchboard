import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { BoardSession } from "../../packages/extension/src/session.js";
import { parseProjectYaml } from "../../packages/extension/src/storage/project.js";
import {
  descendantCounts,
  eventCounts,
  projectCounts,
} from "../../packages/shared/src/domain/deletion.js";

const projectId = "11111111-1111-4111-8111-111111111111";
const eventId = "22222222-2222-4222-8222-222222222222";
const storyId = "33333333-3333-4333-8333-333333333333";
const taskId = "44444444-4444-4444-8444-444444444444";
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
async function fixture(grouped = false) {
  const root = await mkdtemp(join(tmpdir(), "glitchboard-event-task-"));
  roots.push(root);
  const path = join(root, "project.yaml");
  const project = {
    id: projectId,
    name: "Alpha",
    color: "#123456",
    events: [
      {
        id: eventId,
        name: "Release",
        due: "2026-11-20",
        tasks: [],
        stories: grouped
          ? [
              {
                id: storyId,
                name: "作業グループ",
                tasks: [
                  {
                    id: taskId,
                    name: "グループのTask",
                    points: 5,
                    note: "補足",
                  },
                ],
              },
            ]
          : [],
      },
    ],
  };
  await writeFile(path, `# 保持するコメント\n${JSON.stringify(project)}`);
  const manage = join(root, "manage.yaml");
  await writeFile(
    manage,
    JSON.stringify({
      settings: { workdays_off: ["sat", "sun"], public_holidays: true },
      projects: [{ file: "project.yaml", load: true }],
    }),
  );
  const session = new BoardSession(manage);
  await session.reload();
  return { path, session, project };
}

describe("Event直下のTaskの保存", () => {
  it("REQ-033-S01 REQ-028-S05 Storyを作らず直接Taskを保存し、編集、完了と解除を行う", async () => {
    const { path, session } = await fixture();
    expect(
      await session.handleOperation({
        type: "addEventTask",
        eventId,
        name: " 調査 ",
      }),
    ).toEqual({ ok: true });
    await session.reload();
    let event = parseProjectYaml(await readFile(path, "utf8")).events[0];
    expect(event.stories).toEqual([]);
    expect(event.tasks).toHaveLength(1);
    const task = event.tasks?.[0];
    if (!task) throw new Error("直接Taskがない");
    expect(task).toEqual({ id: task.id, name: "調査" });
    expect(
      await session.handleOperation({
        type: "editItem",
        kind: "task",
        id: task.id,
        patch: { name: "調査する", note: "確認" },
      }),
    ).toEqual({ ok: true });
    expect(
      await session.handleOperation({
        type: "updateTask",
        taskId: task.id,
        points: 8,
      }),
    ).toEqual({ ok: true });
    expect(
      await session.handleOperation({
        type: "setTaskDone",
        taskId: task.id,
        done: true,
      }),
    ).toEqual({ ok: true });
    expect(
      await session.handleOperation({
        type: "setTaskDone",
        taskId: task.id,
        done: false,
      }),
    ).toEqual({ ok: true });
    event = parseProjectYaml(await readFile(path, "utf8")).events[0];
    expect(event.tasks).toEqual([
      { id: task.id, name: "調査する", note: "確認", points: 8 },
    ]);
    expect(event.stories).toEqual([]);
    expect(await readFile(path, "utf8")).toContain("# 保持するコメント");
  });

  it("REQ-033-S02 直接とグループの追加先を分け、連続保存でTaskを失わない", async () => {
    const { path, session, project } = await fixture(true);
    expect(
      await Promise.all(
        ["直接A", "直接B"].map((name) =>
          session.handleOperation({ type: "addEventTask", eventId, name }),
        ),
      ),
    ).toEqual([{ ok: true }, { ok: true }]);
    let event = parseProjectYaml(await readFile(path, "utf8")).events[0];
    expect(event.tasks?.map((task) => task.name)).toEqual(["直接A", "直接B"]);
    expect(event.stories).toEqual(project.events[0].stories);
    expect(
      await session.handleOperation({
        type: "addTask",
        storyId,
        name: "グループへ追加",
      }),
    ).toEqual({ ok: true });
    event = parseProjectYaml(await readFile(path, "utf8")).events[0];
    expect(event.stories[0].tasks.map((task) => task.name)).toEqual([
      "グループのTask",
      "グループへ追加",
    ]);
    expect(event.tasks?.map((task) => task.name)).toEqual(["直接A", "直接B"]);
  });

  it("REQ-033-S03 不正な名前と追加先は保存せず、その後の有効な追加を処理する", async () => {
    const { path, session } = await fixture();
    const before = await readFile(path, "utf8");
    for (const operation of [
      { type: "addEventTask", eventId, name: "  " },
      { type: "addEventTask", eventId: storyId, name: "不明" },
    ]) {
      expect(await session.handleOperation(operation)).toMatchObject({
        ok: false,
        error: expect.any(String),
      });
      expect(await readFile(path, "utf8")).toBe(before);
    }
    const broken = new BoardSession(join(path, "manage.yaml"));
    expect(
      await broken.handleOperation({
        type: "addEventTask",
        eventId,
        name: "保存不可",
      }),
    ).toMatchObject({ ok: false });
    expect(await readFile(path, "utf8")).toBe(before);
    expect(
      await session.handleOperation({
        type: "addEventTask",
        eventId,
        name: "復帰",
      }),
    ).toEqual({ ok: true });
  });

  it("REQ-004-S03 直接とStory内で重複したTask IDを拒否する", async () => {
    const { project } = await fixture(true);
    expect(() =>
      parseProjectYaml(
        JSON.stringify({
          ...project,
          events: [
            { ...project.events[0], tasks: [{ id: taskId, name: "重複" }] },
          ],
        }),
      ),
    ).toThrow("重複したID");
  });

  it("REQ-025-S01 直接Taskを子件数へ含め、個別とEvent全体の両方を削除する", async () => {
    const { path, session } = await fixture(true);
    for (const name of ["直接A", "直接B"])
      expect(
        await session.handleOperation({ type: "addEventTask", eventId, name }),
      ).toEqual({ ok: true });
    const project = session.snapshot().projects[0];
    const event = project.events[0];
    expect(eventCounts(event)).toEqual({ events: 0, stories: 1, tasks: 3 });
    expect(projectCounts(project)).toEqual({ events: 1, stories: 1, tasks: 3 });
    const task = event.tasks?.[0];
    if (!task) throw new Error("直接Taskがない");
    expect(descendantCounts([project], "task", task.id)).toEqual({
      events: 0,
      stories: 0,
      tasks: 0,
    });
    expect(
      await session.handleOperation({
        type: "deleteItem",
        kind: "task",
        id: task.id,
        version: session.snapshot().version,
        expected: { events: 0, stories: 0, tasks: 0 },
      }),
    ).toEqual({ ok: true });
    expect(
      session.snapshot().projects[0].events[0].tasks?.map((item) => item.name),
    ).toEqual(["直接B"]);
    const before = await readFile(path, "utf8");
    expect(
      await session.handleOperation({
        type: "deleteItem",
        kind: "event",
        id: eventId,
        version: session.snapshot().version,
        expected: { events: 0, stories: 1, tasks: 1 },
      }),
    ).toMatchObject({ ok: false });
    expect(await readFile(path, "utf8")).toBe(before);
    expect(
      await session.handleOperation({
        type: "deleteItem",
        kind: "event",
        id: eventId,
        version: session.snapshot().version,
        expected: { events: 0, stories: 1, tasks: 2 },
      }),
    ).toEqual({ ok: true });
    expect(parseProjectYaml(await readFile(path, "utf8")).events).toEqual([]);
  });

  it("REQ-037-S01 Event作成後はそのEventを選択してTask追加へ進める", async () => {
    const { session } = await fixture();
    expect(
      await session.handleOperation({
        type: "addEvent",
        projectId,
        name: "新しいEvent",
        due: "2026-11-25",
      }),
    ).toEqual({ ok: true });
    const added = session.snapshot().projects[0].events[1];
    expect(session.snapshot().selectedEventId).toBe(added.id);
    expect(added.tasks).toEqual([]);
    expect(added.stories).toEqual([]);
  });
});

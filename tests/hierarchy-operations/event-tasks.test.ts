import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { BoardSession } from "../../packages/extension/src/session.js";
import { parseProjectYaml } from "../../packages/extension/src/storage/project.js";
import { projectSchema } from "../../packages/shared/src/domain/index.js";

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

async function fixture(legacy = false) {
  const root = await mkdtemp(join(tmpdir(), "glitchboard-event-task-"));
  roots.push(root);
  const path = join(root, "project.yaml");
  const project = {
    id: projectId,
    name: "Alpha",
    color: "#123456",
    note: "Project note",
    events: [
      {
        id: eventId,
        name: "Release",
        due: "2026-11-20",
        stories: legacy
          ? [
              {
                id: storyId,
                name: "EventのTask",
                note: "通常のStory",
                tasks: [
                  {
                    id: taskId,
                    name: "旧Task",
                    points: 5,
                    doneAt: "2026-11-03",
                    note: "旧補足",
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

describe("EventのTaskの保存", () => {
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
    expect(added.name).toBe("新しいEvent");
    expect(session.snapshot().selectedEventId).toBe(added.id);
  });
  it("REQ-033-S01 空のEventから作成して再読込し、従来の編集と完了操作を使える", async () => {
    const { path, session } = await fixture();
    expect(
      await session.handleOperation({
        type: "addEventTask",
        eventId,
        name: " 調査 ",
      }),
    ).toEqual({ ok: true });
    await session.reload();
    const project = parseProjectYaml(await readFile(path, "utf8"));
    expect(project.events[0].stories).toHaveLength(1);
    expect(project.events[0].stories[0]).toMatchObject({
      isDefault: true,
      name: "EventのTask",
      tasks: [{ name: "調査" }],
    });
    const task = project.events[0].stories[0].tasks[0];
    expect(task).not.toHaveProperty("points");
    expect(task).not.toHaveProperty("doneAt");
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
    const saved = parseProjectYaml(await readFile(path, "utf8"));
    expect(saved.events[0].stories[0].tasks).toEqual([
      { id: task.id, name: "調査", points: 8 },
    ]);
    expect(await readFile(path, "utf8")).toContain("# 保持するコメント");
  });

  it("REQ-033-S02 同名Storyを転用せず、連続要求でも専用StoryとTaskを失わない", async () => {
    const { path, session, project } = await fixture(true);
    const results = await Promise.all(
      ["追加A", "追加B"].map((name) =>
        session.handleOperation({ type: "addEventTask", eventId, name }),
      ),
    );
    expect(results).toEqual([{ ok: true }, { ok: true }]);
    const stories = parseProjectYaml(await readFile(path, "utf8")).events[0]
      .stories;
    expect(stories).toHaveLength(2);
    expect(stories[0]).toEqual(project.events[0].stories[0]);
    expect(stories[1]).toMatchObject({
      isDefault: true,
      tasks: [{ name: "追加A" }, { name: "追加B" }],
    });
    expect(new Set(stories[1].tasks.map((task) => task.id)).size).toBe(2);
    expect(
      await session.handleOperation({
        type: "addTask",
        storyId,
        name: "従来操作",
      }),
    ).toEqual({ ok: true });
    expect(
      parseProjectYaml(
        await readFile(path, "utf8"),
      ).events[0].stories[0].tasks.map((task) => task.name),
    ).toEqual(["旧Task", "従来操作"]);
  });

  it("REQ-033-S03 空白、不明な追加先、書込失敗で内容を変えず、その後に復帰する", async () => {
    const { path, session } = await fixture();
    const before = await readFile(path, "utf8");
    for (const operation of [
      { type: "addEventTask", eventId, name: "   " },
      { type: "addEventTask", eventId: storyId, name: "不明" },
    ]) {
      expect(await session.handleOperation(operation)).toMatchObject({
        ok: false,
        error: expect.any(String),
      });
      expect(await readFile(path, "utf8")).toBe(before);
    }
    // ENOTDIR を使い、root権限でも安定して書込不可を再現する。
    const broken = new BoardSession(join(path, "manage.yaml"));
    expect(
      await broken.handleOperation({
        type: "addEventTask",
        eventId,
        name: "保存不可",
      }),
    ).toMatchObject({ ok: false, error: expect.any(String) });
    expect(await readFile(path, "utf8")).toBe(before);
    expect(
      await session.handleOperation({
        type: "addEventTask",
        eventId,
        name: "復帰",
      }),
    ).toEqual({ ok: true });
  });

  it("REQ-033-S03 同じEventの専用Story重複を拒否する", () => {
    const story = {
      id: storyId,
      name: "EventのTask",
      isDefault: true,
      tasks: [],
    };
    expect(
      projectSchema.safeParse({
        id: projectId,
        name: "Alpha",
        color: "#123456",
        events: [
          {
            id: eventId,
            name: "Release",
            due: "2026-11-20",
            stories: [story, { ...story, id: taskId }],
          },
        ],
      }).success,
    ).toBe(false);
  });
});

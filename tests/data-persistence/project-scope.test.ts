import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { BoardSession } from "../../packages/extension/src/session.js";
import { parseProjectYaml } from "../../packages/extension/src/storage/project.js";

const ids = {
  project: "11111111-1111-4111-8111-111111111111",
  event: "22222222-2222-4222-8222-222222222222",
  story: "33333333-3333-4333-8333-333333333333",
  task: "44444444-4444-4444-8444-444444444444",
  grouped: "55555555-5555-4555-8555-555555555555",
};
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "gb-scope-"));
  roots.push(root);
  const sources = ["A", "B"].map((name) =>
    JSON.stringify({
      id: ids.project,
      name,
      color: "#123456",
      events: [
        {
          id: ids.event,
          name: `${name} Event`,
          due: "2026-11-20",
          tasks: [{ id: ids.task, name: `${name} Task`, points: 3 }],
          stories: [
            {
              id: ids.story,
              name: `${name} Story`,
              tasks: [{ id: ids.grouped, name: `${name} Grouped` }],
            },
          ],
        },
      ],
    }),
  );
  for (const [i, name] of ["A", "B"].entries())
    await writeFile(join(root, `${name}.yaml`), sources[i]);
  await writeFile(
    join(root, "manage.yaml"),
    JSON.stringify({
      settings: { workdays_off: [], public_holidays: false },
      projects: [
        { file: "A.yaml", load: true },
        { file: "B.yaml", load: true },
      ],
    }),
  );
  const session = new BoardSession(join(root, "manage.yaml"));
  await session.reload();
  const read = async (name: string) =>
    parseProjectYaml(await readFile(join(root, `${name}.yaml`), "utf8"));
  return { root, sources, session, read };
}

describe("Projectファイルで操作を特定する", () => {
  it.each([
    {
      type: "editItem",
      kind: "task",
      id: ids.task,
      patch: { name: "changed" },
    },
    {
      type: "editItem",
      kind: "task",
      id: ids.grouped,
      patch: { note: "changed" },
    },
    {
      type: "editItem",
      kind: "story",
      id: ids.story,
      patch: { name: "changed" },
    },
    {
      type: "editItem",
      kind: "event",
      id: ids.event,
      patch: { due: "2026-11-25" },
    },
    {
      type: "editItem",
      kind: "project",
      id: ids.project,
      patch: { name: "changed" },
    },
    { type: "updateTask", taskId: ids.task, points: 8 },
    { type: "setTaskDone", taskId: ids.grouped, done: true },
    { type: "addStory", eventId: ids.event, name: "追加" },
    { type: "addEventTask", eventId: ids.event, name: "追加" },
    { type: "addTask", storyId: ids.story, name: "追加" },
    {
      type: "addEvent",
      projectId: ids.project,
      name: "追加",
      due: "2026-11-26",
    },
  ])("REQ-005-S03 $type/$kind は指定したBだけを更新する", async (operation) => {
    const { root, sources, session } = await fixture();
    expect(
      await session.handleOperation({ ...operation, projectFile: "B.yaml" }),
    ).toEqual({ ok: true });
    expect(await readFile(join(root, "A.yaml"), "utf8")).toBe(sources[0]);
    expect(await readFile(join(root, "B.yaml"), "utf8")).not.toBe(sources[1]);
  });
  it.each([
    {
      kind: "task",
      id: ids.task,
      expected: { events: 0, stories: 0, tasks: 0 },
    },
    {
      kind: "task",
      id: ids.grouped,
      expected: { events: 0, stories: 0, tasks: 0 },
    },
    {
      kind: "story",
      id: ids.story,
      expected: { events: 0, stories: 0, tasks: 1 },
    },
    {
      kind: "event",
      id: ids.event,
      expected: { events: 0, stories: 1, tasks: 2 },
    },
    {
      kind: "project",
      id: ids.project,
      expected: { events: 1, stories: 1, tasks: 2 },
    },
  ])("REQ-005-S03 $kind の削除はBだけに作用する", async (target) => {
    const { root, sources, session, read } = await fixture();
    expect(
      await session.handleOperation({
        type: "deleteItem",
        ...target,
        projectFile: "B.yaml",
        version: session.snapshot().version,
      }),
    ).toEqual({ ok: true });
    expect(await readFile(join(root, "A.yaml"), "utf8")).toBe(sources[0]);
    if (target.kind === "project") await expect(read("B")).rejects.toThrow();
    else
      expect(JSON.stringify(await read("B"))).not.toContain(
        `"id":"${target.id}"`,
      );
  });
  it("REQ-005-S04 曖昧、未登録、読込対象外の参照は全ファイルを変更しない", async () => {
    const { root, sources, session } = await fixture();
    for (const projectFile of [undefined, "missing.yaml", "../B.yaml"]) {
      for (const operation of [
        { type: "updateTask", taskId: ids.task, points: 8 },
        {
          type: "editItem",
          kind: "event",
          id: ids.event,
          patch: { name: "wrong" },
        },
        { type: "addStory", eventId: ids.event, name: "wrong" },
        { type: "selectEvent", eventId: ids.event },
        {
          type: "deleteItem",
          kind: "task",
          id: ids.task,
          version: session.snapshot().version,
          expected: { events: 0, stories: 0, tasks: 0 },
        },
      ]) {
        expect(
          await session.handleOperation({ ...operation, projectFile }),
        ).toMatchObject({ ok: false, error: expect.any(String) });
      }
    }
    await session.handleOperation({
      type: "setProjectLoaded",
      file: "B.yaml",
      load: false,
    });
    expect(
      await session.handleOperation({
        type: "updateTask",
        taskId: ids.task,
        points: 8,
        projectFile: "B.yaml",
      }),
    ).toMatchObject({ ok: false });
    for (const [i, name] of ["A", "B"].entries())
      expect(await readFile(join(root, `${name}.yaml`), "utf8")).toBe(
        sources[i],
      );
  });
  it("REQ-005-S04 指定Projectにない別ProjectのIDを操作しない", async () => {
    const { root, session, read } = await fixture();
    expect(
      await session.handleOperation({
        type: "addEventTask",
        projectFile: "B.yaml",
        eventId: ids.event,
        name: "BだけのTask",
      }),
    ).toEqual({ ok: true });
    const onlyB = (await read("B")).events[0].tasks?.at(-1)?.id;
    if (!onlyB) throw new Error("追加Taskがない");
    const before = await Promise.all(
      ["A", "B"].map((name) => readFile(join(root, `${name}.yaml`), "utf8")),
    );
    expect(
      await session.handleOperation({
        type: "updateTask",
        taskId: onlyB,
        projectFile: "A.yaml",
        points: 8,
      }),
    ).toMatchObject({ ok: false });
    expect(
      await Promise.all(
        ["A", "B"].map((name) => readFile(join(root, `${name}.yaml`), "utf8")),
      ),
    ).toEqual(before);
  });
  it("REQ-005-S05 Eventの選択はファイル参照を持ち再読込で維持する", async () => {
    const { session } = await fixture();
    expect(
      await session.handleOperation({
        type: "selectEvent",
        eventId: ids.event,
        projectFile: "B.yaml",
      }),
    ).toEqual({ ok: true });
    expect(session.snapshot()).toMatchObject({
      selectedEventId: ids.event,
      selectedProjectFile: "B.yaml",
    });
    await session.reload();
    expect(session.snapshot()).toMatchObject({
      selectedEventId: ids.event,
      selectedProjectFile: "B.yaml",
    });
    expect(
      session.snapshot().projects.map((project) => project.sourceFile),
    ).toEqual(["A.yaml", "B.yaml"]);
  });
  it("REQ-005-S07 同じProject UUIDでもファイル参照で並べ替える", async () => {
    const { root, sources, session } = await fixture();
    expect(
      await session.handleOperation({
        type: "moveProject",
        projectId: ids.project,
        targetProjectId: ids.project,
        projectFile: "B.yaml",
        targetProjectFile: "A.yaml",
        placement: "before",
      }),
    ).toEqual({ ok: true });
    expect(session.snapshot().projects.map((project) => project.name)).toEqual([
      "B",
      "A",
    ]);
    for (const [i, name] of ["A", "B"].entries())
      expect(await readFile(join(root, `${name}.yaml`), "utf8")).toBe(
        sources[i],
      );
  });
});

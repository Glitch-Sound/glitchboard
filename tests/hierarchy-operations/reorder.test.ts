import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  isNode,
  parseDocument,
  stringify,
} from "../../packages/extension/node_modules/yaml/dist/index.js";
import { BoardSession } from "../../packages/extension/src/session.js";
import { parseProjectYaml } from "../../packages/extension/src/storage/project.js";
import {
  eventPoints,
  type Project,
} from "../../packages/shared/src/domain/index.js";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "gb-reorder-"));
  roots.push(root);
  const task = (name: string) => ({
    id: randomUUID(),
    name,
    points: 3 as const,
    doneAt: name.endsWith("B") ? "2026-11-01" : undefined,
    note: `${name}の補足`,
  });
  const story = (name: string) => ({
    id: randomUUID(),
    name,
    tasks: [task(`${name} A`), task(`${name} B`), task(`${name} C`)],
  });
  const event = (name: string) => ({
    id: randomUUID(),
    name,
    due: "2026-12-20",
    tasks: [task(`${name} A`), task(`${name} B`), task(`${name} C`)],
    stories: [story("Story A"), story("Story B"), story("Story C")],
  });
  const project: Project = {
    id: randomUUID(),
    name: "Alpha",
    color: "#123456",
    events: [event("Event A"), event("Event B")],
  };
  const document = parseDocument(stringify(project));
  const node = document.getIn(["events", 0, "stories", 0], true);
  if (isNode(node)) node.commentBefore = " Storyのコメント";
  const taskNode = document.getIn(
    ["events", 0, "stories", 0, "tasks", 0],
    true,
  );
  if (isNode(taskNode)) taskNode.comment = " Taskのコメント";
  const source = String(document);
  await writeFile(join(root, "a.yaml"), source);
  await writeFile(
    join(root, "b.yaml"),
    source.replace("name: Alpha", "name: Beta"),
  );
  const manage = join(root, "manage.yaml");
  await writeFile(
    manage,
    stringify({
      settings: { workdays_off: [], public_holidays: false },
      projects: [
        { file: "a.yaml", load: true },
        { file: "b.yaml", load: true },
      ],
    }),
  );
  const session = new BoardSession(manage);
  await session.reload();
  return {
    root,
    project,
    session,
    source,
    read: async (file = "a.yaml") =>
      parseProjectYaml(await readFile(join(root, file), "utf8")),
  };
}
describe("StoryとTaskの保存順", () => {
  it.each(["before", "after"] as const)(
    "REQ-045-S01 REQ-045-S07 Storyを%sへ保存し、他のProjectと内容を保つ",
    async (placement) => {
      const { root, project, session, source, read } = await fixture();
      const event = project.events[0],
        stories = event.stories;
      expect(
        await session.handleOperation({
          type: "moveStory",
          projectFile: "a.yaml",
          eventId: event.id,
          storyId: stories[0].id,
          targetStoryId: stories[2].id,
          placement,
        }),
      ).toEqual({ ok: true });
      await session.reload();
      const saved = await read();
      expect(saved.events[0].stories.map((s) => s.id)).toEqual(
        placement === "before"
          ? [stories[1].id, stories[0].id, stories[2].id]
          : [stories[1].id, stories[2].id, stories[0].id],
      );
      expect(
        [...saved.events[0].stories].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      ).toEqual(stories);
      expect(eventPoints(saved.events[0])).toEqual(eventPoints(event));
      expect(await readFile(join(root, "b.yaml"), "utf8")).toBe(
        source.replace("name: Alpha", "name: Beta"),
      );
      expect(await readFile(join(root, "a.yaml"), "utf8")).toContain(
        "# Storyのコメント",
      );
    },
  );
  it.each([null, 0] as const)(
    "REQ-045-S02 REQ-045-S07 Taskの親=%sだけを移動してコメントと完了を保持する",
    async (group) => {
      const { root, project, session, read } = await fixture();
      const event = project.events[0],
        story = group === null ? null : event.stories[group],
        tasks = story ? story.tasks : (event.tasks ?? []);
      expect(
        await session.handleOperation({
          type: "moveTask",
          projectFile: "a.yaml",
          eventId: event.id,
          storyId: story?.id ?? null,
          taskId: tasks[2].id,
          targetTaskId: tasks[0].id,
          placement: "before",
        }),
      ).toEqual({ ok: true });
      await session.reload();
      const saved = await read(),
        savedEvent = saved.events[0],
        savedTasks = story
          ? savedEvent.stories[group ?? 0].tasks
          : (savedEvent.tasks ?? []);
      expect(savedTasks).toEqual([tasks[2], tasks[0], tasks[1]]);
      expect(savedEvent.stories.slice(story ? 1 : 0)).toEqual(
        event.stories.slice(story ? 1 : 0),
      );
      expect(saved.events[1]).toEqual(project.events[1]);
      expect(eventPoints(savedEvent)).toEqual(eventPoints(event));
      expect(await readFile(join(root, "a.yaml"), "utf8")).toContain(
        "# Taskのコメント",
      );
    },
  );
  it("REQ-045-S03 REQ-045-S07 別Event、Story、Projectと不明IDを拒否し、自己移動ではファイルを書かない", async () => {
    const { root, project, session, source } = await fixture();
    const event = project.events[0],
      story = event.stories[0];
    const base = {
      type: "moveTask",
      projectFile: "a.yaml",
      eventId: event.id,
      storyId: story.id,
      taskId: story.tasks[0].id,
      targetTaskId: story.tasks[1].id,
      placement: "after",
    };
    for (const patch of [
      { targetTaskId: event.stories[1].tasks[0].id },
      { targetTaskId: (event.tasks ?? [])[0].id },
      { eventId: project.events[1].id },
      { targetProjectFile: "b.yaml" },
      { targetTaskId: randomUUID() },
    ])
      expect((await session.handleOperation({ ...base, ...patch })).ok).toBe(
        false,
      );
    expect(
      await session.handleOperation({ ...base, targetTaskId: base.taskId }),
    ).toEqual({ ok: true });
    expect(await readFile(join(root, "a.yaml"), "utf8")).toBe(source);
    expect(
      (
        await session.handleOperation({
          type: "moveStory",
          projectFile: "a.yaml",
          eventId: event.id,
          storyId: story.id,
          targetStoryId: project.events[1].stories[0].id,
          placement: "before",
        })
      ).ok,
    ).toBe(false);
    expect(await readFile(join(root, "a.yaml"), "utf8")).toBe(source);
  });
  it("REQ-045-S05 最新の不在ファイルで失敗しても既存ファイルを変更せず、復元後は再操作できる", async () => {
    const { root, project, session, source, read } = await fixture();
    const event = project.events[0],
      op = {
        type: "moveStory",
        projectFile: "a.yaml",
        eventId: event.id,
        storyId: event.stories[0].id,
        targetStoryId: event.stories[1].id,
        placement: "after",
      };
    await rm(join(root, "a.yaml"));
    expect((await session.handleOperation(op)).ok).toBe(false);
    expect(await readFile(join(root, "b.yaml"), "utf8")).toBe(
      source.replace("name: Alpha", "name: Beta"),
    );
    await writeFile(join(root, "a.yaml"), source);
    expect(await session.handleOperation(op)).toEqual({ ok: true });
    expect((await read()).events[0].stories.map((s) => s.name)).toEqual([
      "Story B",
      "Story A",
      "Story C",
    ]);
  });
});

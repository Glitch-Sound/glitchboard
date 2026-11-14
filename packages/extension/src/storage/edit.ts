import { randomUUID } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { parseDocument } from "yaml";
import {
  eventSchema,
  projectSchema,
  storySchema,
  taskSchema,
} from "../../../shared/src/domain/index.js";
import type { Operation } from "../../../shared/src/domain/messages.js";
import { parseProjectYaml } from "./project.js";

type Edit = Extract<Operation, { type: "editItem" }>;
const allowed = {
  project: ["name", "color", "note"],
  event: ["name", "due", "note"],
  story: ["name", "note"],
  task: ["name", "points", "note"],
} as const;

/** REQ-027/REQ-028: 階層項目の検証済みフィールドをコメント保持して保存する。 */
export async function editProjectItem(
  path: string,
  kind: Edit["kind"],
  id: string,
  patch: Edit["patch"],
): Promise<void> {
  for (const key of Object.keys(patch))
    if (!(allowed[kind] as readonly string[]).includes(key))
      throw new Error(`${kind}では${key}を編集できない`);
  const source = await readFile(path, "utf8");
  const project = parseProjectYaml(source);
  const document = parseDocument(source, { uniqueKeys: true });
  let target: (string | number)[] | null = null;
  let item: object | null = null;
  if (kind === "project" && project.id === id) {
    target = [];
    item = project;
  }
  for (const [eventIndex, event] of project.events.entries()) {
    if (kind === "event" && event.id === id) {
      target = ["events", eventIndex];
      item = event;
    }
    for (const [storyIndex, story] of event.stories.entries()) {
      if (kind === "story" && story.id === id) {
        target = ["events", eventIndex, "stories", storyIndex];
        item = story;
      }
      for (const [taskIndex, task] of story.tasks.entries()) {
        if (kind === "task" && task.id === id) {
          target = [
            "events",
            eventIndex,
            "stories",
            storyIndex,
            "tasks",
            taskIndex,
          ];
          item = task;
        }
      }
    }
  }
  if (!target || !item) throw new Error(`編集対象が見つからない: ${id}`);
  const normalized = {
    ...patch,
    points: patch.points === null ? undefined : patch.points,
  };
  const candidate = { ...item, ...normalized };
  const schema =
    kind === "project"
      ? projectSchema
      : kind === "event"
        ? eventSchema
        : kind === "story"
          ? storySchema
          : taskSchema;
  schema.parse(candidate);
  for (const [key, value] of Object.entries(patch)) {
    const actual = key === "points" && value === null ? undefined : value;
    if (actual === undefined) document.deleteIn([...target, key]);
    else document.setIn([...target, key], actual);
  }
  parseProjectYaml(String(document));
  const temp = `${path}.${randomUUID()}.tmp`;
  await writeFile(temp, String(document), { flag: "wx" });
  await rename(temp, path);
}

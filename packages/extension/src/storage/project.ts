import { randomUUID } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { parseDocument } from "yaml";
import {
  type Project,
  projectSchema,
  type Task,
  taskSchema,
} from "../../../shared/src/domain/index.js";

/** REQ-001/REQ-004: Project YAMLを検証済みの4階層モデルへ変換する。 */
export function parseProjectYaml(source: string): Project {
  const document = parseDocument(source, { uniqueKeys: true });
  if (document.errors.length > 0) {
    throw new Error(document.errors.map((error) => error.message).join("\n"));
  }
  const project = projectSchema.parse(document.toJS());
  const ids = new Set<string>();
  const check = (item: { id: string }) => {
    if (ids.has(item.id)) throw new Error(`重複したID: ${item.id}`);
    ids.add(item.id);
  };
  check(project);
  for (const event of project.events) {
    check(event);
    for (const task of event.tasks ?? []) check(task);
    for (const story of event.stories) {
      check(story);
      for (const task of story.tasks) check(task);
    }
  }
  return project;
}

/** 直接TaskとStory内Taskの保存先を共通解決する。 */
export function taskLocation(
  project: Project,
  taskId: string,
): { task: Task; path: (string | number)[] } | null {
  for (const [eventIndex, event] of project.events.entries()) {
    const directIndex =
      event.tasks?.findIndex((task) => task.id === taskId) ?? -1;
    if (directIndex >= 0 && event.tasks)
      return {
        task: event.tasks[directIndex],
        path: ["events", eventIndex, "tasks", directIndex],
      };
    for (const [storyIndex, story] of event.stories.entries()) {
      const taskIndex = story.tasks.findIndex((task) => task.id === taskId);
      if (taskIndex >= 0)
        return {
          task: story.tasks[taskIndex],
          path: [
            "events",
            eventIndex,
            "stories",
            storyIndex,
            "tasks",
            taskIndex,
          ],
        };
    }
  }
  return null;
}

/** REQ-004: 対象ノードだけを編集して他のYAMLコメントを保持する。 */
export async function updateTask(
  path: string,
  taskId: string,
  patch: Partial<Pick<Task, "name" | "points" | "doneAt" | "note">>,
): Promise<void> {
  const source = await readFile(path, "utf8");
  const project = parseProjectYaml(source);
  const document = parseDocument(source, { uniqueKeys: true });
  const location = taskLocation(project, taskId);
  if (!location) throw new Error(`Taskが見つからない: ${taskId}`);
  const task = taskSchema.parse({ ...location.task, ...patch });
  for (const key of ["name", "points", "doneAt", "note"] as const) {
    if (!Object.hasOwn(patch, key)) continue;
    const target = [...location.path, key];
    const value = task[key];
    if (value === undefined) document.deleteIn(target);
    else document.setIn(target, value);
  }
  parseProjectYaml(String(document));
  const temp = `${path}.${randomUUID()}.tmp`;
  await writeFile(temp, String(document), { flag: "wx" });
  await rename(temp, path);
}

/** REQ-005: Projectの名称変更ではファイルのパスを変えない。 */
export async function renameProject(path: string, name: string): Promise<void> {
  const source = await readFile(path, "utf8");
  const project = parseProjectYaml(source);
  projectSchema.parse({ ...project, name });
  const document = parseDocument(source, { uniqueKeys: true });
  document.set("name", name);
  parseProjectYaml(String(document));
  const temp = `${path}.${randomUUID()}.tmp`;
  await writeFile(temp, String(document), { flag: "wx" });
  await rename(temp, path);
}

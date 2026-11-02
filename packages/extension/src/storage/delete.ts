import { randomUUID } from "node:crypto";
import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import { parseDocument } from "yaml";
import type { ItemKind } from "../../../shared/src/domain/deletion.js";
import { manageSchema } from "../../../shared/src/domain/manage.js";
import { parseProjectYaml } from "./project.js";

async function replace(path: string, content: string): Promise<void> {
  const temp = `${path}.${randomUUID()}.tmp`;
  await writeFile(temp, content, { flag: "wx" });
  await rename(temp, path);
}

/** REQ-025: 対象と子孫をYAMLから物理削除する。 */
export async function deleteProjectItem(
  path: string,
  kind: Exclude<ItemKind, "project">,
  id: string,
): Promise<void> {
  const source = await readFile(path, "utf8");
  const project = parseProjectYaml(source);
  const document = parseDocument(source, { uniqueKeys: true });
  let target: (string | number)[] | null = null;
  for (const [eventIndex, event] of project.events.entries()) {
    if (kind === "event" && event.id === id) target = ["events", eventIndex];
    for (const [storyIndex, story] of event.stories.entries()) {
      if (kind === "story" && story.id === id)
        target = ["events", eventIndex, "stories", storyIndex];
      for (const [taskIndex, task] of story.tasks.entries()) {
        if (kind === "task" && task.id === id)
          target = [
            "events",
            eventIndex,
            "stories",
            storyIndex,
            "tasks",
            taskIndex,
          ];
      }
    }
  }
  if (!target) throw new Error(`削除対象が見つからない: ${id}`);
  document.deleteIn(target);
  parseProjectYaml(String(document));
  await replace(path, String(document));
}

/** REQ-025: Projectの参照とYAMLファイルを削除する。 */
export async function deleteProjectFile(
  managePath: string,
  file: string,
  projectPath: string,
): Promise<void> {
  const source = await readFile(managePath, "utf8");
  const document = parseDocument(source, { uniqueKeys: true });
  if (document.errors.length) throw new Error("manage.yamlを解析できない");
  const manage = manageSchema.parse(document.toJS());
  const index = manage.projects.findIndex((entry) => entry.file === file);
  if (index < 0) throw new Error(`Projectが見つからない: ${file}`);
  document.deleteIn(["projects", index]);
  manageSchema.parse(document.toJS());
  await replace(managePath, String(document));
  await unlink(projectPath);
}

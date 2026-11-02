import { randomUUID } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { parseDocument } from "yaml";
import {
  type Event,
  eventSchema,
  type Story,
  storySchema,
  type Task,
  taskSchema,
} from "../../../shared/src/domain/index.js";
import { parseProjectYaml } from "./project.js";

async function editProject(
  path: string,
  edit: (
    document: ReturnType<typeof parseDocument>,
    project: ReturnType<typeof parseProjectYaml>,
  ) => void,
): Promise<void> {
  const source = await readFile(path, "utf8");
  const project = parseProjectYaml(source);
  const document = parseDocument(source, { uniqueKeys: true });
  edit(document, project);
  parseProjectYaml(String(document));
  const temp = `${path}.${randomUUID()}.tmp`;
  await writeFile(temp, String(document), { flag: "wx" });
  await rename(temp, path);
}

/** REQ-022: Project YAMLへEventをUUID付きで追加する。 */
export async function addEvent(
  path: string,
  name: string,
  due: string,
): Promise<Event> {
  const event = eventSchema.parse({ id: randomUUID(), name, due, stories: [] });
  await editProject(path, (document) => {
    document.addIn(["events"], event);
  });
  return event;
}

/** REQ-022: 指定EventへStoryを追加する。 */
export async function addStory(
  path: string,
  eventId: string,
  name: string,
): Promise<Story> {
  const story = storySchema.parse({ id: randomUUID(), name, tasks: [] });
  await editProject(path, (document, project) => {
    const index = project.events.findIndex((event) => event.id === eventId);
    if (index < 0) throw new Error(`Eventが見つからない: ${eventId}`);
    document.addIn(["events", index, "stories"], story);
  });
  return story;
}

/** REQ-022: 指定Storyへ未見積Taskを追加する。 */
export async function addTask(
  path: string,
  storyId: string,
  name: string,
): Promise<Task> {
  const task = taskSchema.parse({ id: randomUUID(), name });
  await editProject(path, (document, project) => {
    for (const [eventIndex, event] of project.events.entries()) {
      const storyIndex = event.stories.findIndex(
        (story) => story.id === storyId,
      );
      if (storyIndex >= 0) {
        document.addIn(
          ["events", eventIndex, "stories", storyIndex, "tasks"],
          task,
        );
        return;
      }
    }
    throw new Error(`Storyが見つからない: ${storyId}`);
  });
  return task;
}

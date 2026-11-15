import { randomUUID } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { isSeq, parseDocument } from "yaml";
import type { Operation } from "../../../shared/src/domain/messages.js";
import { parseProjectYaml } from "./project.js";

/** REQ-045: 同じ親の配列ノードだけを移動し、所属とコメントを保持する。 */
export async function reorderChild(
  path: string,
  operation: Extract<Operation, { type: "moveStory" | "moveTask" }>,
): Promise<void> {
  const source = await readFile(path, "utf8");
  const project = parseProjectYaml(source);
  const eventIndex = project.events.findIndex(
    (e) => e.id === operation.eventId,
  );
  const event = project.events[eventIndex];
  if (!event) throw new Error("並べ替え先のEventが見つからない");
  const parent: (string | number)[] = ["events", eventIndex];
  let items: readonly { id: string }[];
  let id: string;
  let target: string;
  if (operation.type === "moveStory") {
    parent.push("stories");
    items = event.stories;
    id = operation.storyId;
    target = operation.targetStoryId;
  } else {
    if (operation.storyId !== null) {
      const index = event.stories.findIndex((s) => s.id === operation.storyId);
      if (index < 0) throw new Error("並べ替え先のStoryが見つからない");
      parent.push("stories", index);
      items = event.stories[index].tasks;
    } else items = event.tasks ?? [];
    parent.push("tasks");
    id = operation.taskId;
    target = operation.targetTaskId;
  }
  const from = items.findIndex((item) => item.id === id);
  const targetIndex = items.findIndex((item) => item.id === target);
  if (from < 0 || targetIndex < 0)
    throw new Error("同じ所属の並べ替え対象が見つからない");
  if (from === targetIndex) return;
  const document = parseDocument(source, { uniqueKeys: true });
  const sequence = document.getIn(parent, true);
  if (!isSeq(sequence)) throw new Error("並べ替え対象が配列ではない");
  const [moved] = sequence.items.splice(from, 1);
  const to =
    targetIndex -
    (from < targetIndex ? 1 : 0) +
    (operation.placement === "after" ? 1 : 0);
  sequence.items.splice(to, 0, moved);
  const output = String(document);
  if (output === source) return;
  parseProjectYaml(output);
  const temp = `${path}.${randomUUID()}.tmp`;
  await writeFile(temp, output, { flag: "wx" });
  await rename(temp, path);
}

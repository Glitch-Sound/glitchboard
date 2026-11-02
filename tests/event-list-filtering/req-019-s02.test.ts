import { describe, expect, it } from "vitest";
import type { Project } from "../../packages/shared/src/domain/index.js";
import { groupEvents } from "../../packages/webview/src/pages/event-list/model/groupEvents.js";

describe("REQ-019-S02 完了済み", () => {
  it("1件以上のTaskがすべて完了したEventだけを完了済みにする", () => {
    const project = {
      id: "project",
      name: "Alpha",
      color: "#123456",
      events: [
        {
          id: "done",
          name: "Done",
          due: "2026-11-08",
          stories: [
            {
              id: "story",
              name: "Work",
              tasks: [{ id: "task", name: "Task", doneAt: "2026-11-02" }],
            },
          ],
        },
        { id: "empty", name: "Empty", due: "2026-11-09", stories: [] },
      ],
    } as Project;
    const groups = groupEvents([project], "2026-11-03", "all");
    expect(groups.completed.map((item) => item.event.id)).toEqual(["done"]);
    expect(groups.future.map((item) => item.event.id)).toEqual(["empty"]);
  });
});

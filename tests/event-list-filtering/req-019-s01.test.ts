import { describe, expect, it } from "vitest";
import type { Project } from "../../packages/shared/src/domain/index.js";
import { groupEvents } from "../../packages/webview/src/pages/event-list/model/groupEvents.js";

describe("REQ-019-S01 日曜の境界", () => {
  it("日曜期限は今週、翌月曜期限は今後に入れる", () => {
    const project = {
      id: "project",
      name: "Alpha",
      color: "#123456",
      events: [
        { id: "sunday", name: "Sunday", due: "2026-11-08", stories: [] },
        { id: "monday", name: "Monday", due: "2026-11-09", stories: [] },
      ],
    } as Project;
    const groups = groupEvents([project], "2026-11-03", "pending");
    expect(groups.week.map((item) => item.event.id)).toEqual(["sunday"]);
    expect(groups.future.map((item) => item.event.id)).toEqual(["monday"]);
  });
});

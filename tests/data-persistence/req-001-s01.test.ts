import { describe, expect, it } from "vitest";
import { parseProjectYaml } from "../../packages/extension/src/storage/project.js";

describe("REQ-001-S01 階層を読み込む", () => {
  it("Event直下とStory内のTaskの属性を読む", () => {
    const project = parseProjectYaml(`
id: 6d947a2f-36c7-4c59-a42e-96c385d4be85
name: Alpha
color: '#4277cc'
events:
  - id: 3169798f-f7ea-4256-a80e-65c732f68533
    name: Release
    due: 2026-11-20
    tasks:
      - id: 55555555-5555-4555-8555-555555555555
        name: Direct
        points: 8
    stories:
      - id: 0c831a41-ce09-430a-82e1-a615296d43dc
        name: Docs
        tasks:
          - id: 9645dc16-3ab7-4108-a00e-9d9d568486fe
            name: Write
            points: 5
            doneAt: 2026-11-03
`);
    expect(project.events[0]?.stories[0]?.tasks[0]).toMatchObject({
      name: "Write",
      points: 5,
      doneAt: "2026-11-03",
    });
    expect(project.events[0]?.tasks).toEqual([
      { id: "55555555-5555-4555-8555-555555555555", name: "Direct", points: 8 },
    ]);
    expect(project.events[0]?.due).toBe("2026-11-20");
  });
});

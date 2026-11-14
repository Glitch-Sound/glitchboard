import { describe, expect, it } from "vitest";
import { parseProjectYaml } from "../../packages/extension/src/storage/project.js";
import { effectiveTaskPoints } from "../../packages/shared/src/domain/index.js";

describe("REQ-001-S02 未見積と未完了", () => {
  it("省略した points は3pt、doneAt は未完了と扱う", () => {
    const project = parseProjectYaml(`
id: 6d947a2f-36c7-4c59-a42e-96c385d4be85
name: Alpha
color: '#4277cc'
events:
  - id: 3169798f-f7ea-4256-a80e-65c732f68533
    name: Release
    due: 2026-11-20
    stories:
      - id: 0c831a41-ce09-430a-82e1-a615296d43dc
        name: Docs
        tasks:
          - id: 9645dc16-3ab7-4108-a00e-9d9d568486fe
            name: Write
`);
    const task = project.events[0]?.stories[0]?.tasks[0];
    expect(task).toBeDefined();
    if (!task) throw new Error("Taskがない");
    expect(task.points).toBeUndefined();
    expect(task.doneAt).toBeUndefined();
    expect(effectiveTaskPoints(task)).toBe(3);
  });
});

import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { updateTask } from "../../packages/extension/src/storage/project.js";

describe("REQ-004-S02 コメント保持", () => {
  it("別Taskの編集で対象外のコメントを保つ", async () => {
    const root = await mkdtemp(join(tmpdir(), "glitchboard-"));
    const path = join(root, "0001_alpha.yaml");
    await writeFile(
      path,
      `id: 6d947a2f-36c7-4c59-a42e-96c385d4be85\nname: Alpha\ncolor: '#336699'\nevents:\n  - id: 3169798f-f7ea-4256-a80e-65c732f68533\n    name: Event\n    due: 2026-11-20\n    stories:\n      - id: 0c831a41-ce09-430a-82e1-a615296d43dc\n        name: Story\n        tasks:\n          # 重要な既存コメント\n          - id: 9645dc16-3ab7-4108-a00e-9d9d568486fe\n            name: Keep\n          - id: a9d654c1-7c24-4730-981b-e3017a0c5dc4\n            name: Change\n`,
    );
    await updateTask(path, "a9d654c1-7c24-4730-981b-e3017a0c5dc4", {
      name: "Changed",
    });
    const result = await readFile(path, "utf8");
    expect(result).toContain("# 重要な既存コメント");
    expect(result).toContain("name: Changed");
  });
});

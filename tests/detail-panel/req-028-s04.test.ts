import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BoardSession } from "../../packages/extension/src/session.js";

describe("REQ-028-S04 旧リンク情報の除去", () => {
  it("読み込み時に全階層のlinksをProject YAMLから除去し、補足を保持する", async () => {
    const root = await mkdtemp(join(tmpdir(), "glitchboard-note-"));
    const manage = join(root, "manage.yaml");
    const projectPath = join(root, "project.yaml");
    await writeFile(
      manage,
      "settings: {workdays_off: [sat, sun], public_holidays: false}\nprojects: [{file: project.yaml, load: true}, {file: unloaded.yaml, load: false}]\n",
    );
    await writeFile(
      projectPath,
      `# Projectのコメント
id: 11111111-1111-4111-8111-111111111111
name: Alpha
color: '#123456'
note: 説明
links: [{label: 旧, target: guide.md}]
events:
  - id: 22222222-2222-4222-8222-222222222222
    name: Release
    due: 2026-11-10
    links: []
    stories:
      - id: 33333333-3333-4333-8333-333333333333
        name: Story
        links: []
        tasks:
          - id: 44444444-4444-4444-8444-444444444444
            name: Task
            links: []
`,
    );
    const unloadedPath = join(root, "unloaded.yaml");
    await writeFile(
      unloadedPath,
      "id: 55555555-5555-4555-8555-555555555555\nname: Unloaded\ncolor: '#abcdef'\nlinks: []\nevents: []\n",
    );
    const session = new BoardSession(manage);
    await session.reload();
    const saved = await readFile(projectPath, "utf8");
    expect(saved).not.toContain("links:");
    expect(await readFile(unloadedPath, "utf8")).not.toContain("links:");
    expect(saved).toContain("# Projectのコメント");
    expect(saved).toContain("note: 説明");
    expect(session.snapshot().projects[0]?.note).toBe("説明");
  });

  it("新たなlinksの保存要求を受け付けない", async () => {
    const root = await mkdtemp(join(tmpdir(), "glitchboard-no-link-"));
    const manage = join(root, "manage.yaml");
    const projectPath = join(root, "project.yaml");
    await writeFile(
      manage,
      "settings: {workdays_off: [sat, sun], public_holidays: false}\nprojects: [{file: project.yaml, load: true}]\n",
    );
    await writeFile(
      projectPath,
      "id: 11111111-1111-4111-8111-111111111111\nname: Alpha\ncolor: '#123456'\nevents: []\n",
    );
    const session = new BoardSession(manage);
    await session.reload();
    const result = await session.handleOperation({
      type: "editItem",
      kind: "project",
      id: "11111111-1111-4111-8111-111111111111",
      patch: { links: [{ label: "旧", target: "guide.md" }] },
    });
    expect(result.ok).toBe(false);
    expect(await readFile(projectPath, "utf8")).not.toContain("links:");
  });
});

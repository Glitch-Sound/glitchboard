import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BoardSession } from "../../packages/extension/src/session.js";

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "glitchboard-order-"));
  const path = join(root, "manage.yaml");
  await writeFile(
    path,
    `# 管理設定\nsettings: {workdays_off: [], public_holidays: false}\nprojects:\n  # Alphaの設定\n  - {file: a.yaml, load: true} # Alphaの行\n  - {file: hidden.yaml, load: false}\n  - {file: b.yaml, load: true}\n  - {file: c.yaml, load: true}\n`,
  );
  const ids: Record<string, string> = {};
  for (const name of ["a", "hidden", "b", "c"]) {
    ids[name] = randomUUID();
    await writeFile(
      join(root, `${name}.yaml`),
      `id: ${ids[name]}\nname: ${name}\ncolor: '#123456'\nevents: []\n`,
    );
  }
  const session = new BoardSession(path);
  await session.reload();
  return { root, path, session, ids };
}

describe("REQ-032 Projectの表示順の保存", () => {
  it("REQ-032-S04 同じProjectへの移動はファイルを変更しない", async () => {
    const { path, session, ids } = await fixture();
    const before = await readFile(path, "utf8");
    expect(
      await session.handleOperation({
        type: "moveProject",
        projectId: ids.a,
        targetProjectId: ids.a,
        placement: "after",
      }),
    ).toEqual({ ok: true });
    expect(await readFile(path, "utf8")).toBe(before);
  });
  it("REQ-032-S03 先頭・末尾へ移動でき、非表示の位置、コメント、Projectデータを保持して再読込する", async () => {
    const { root, path, session, ids } = await fixture();
    const projectBefore = await Promise.all(
      ["a", "hidden", "b", "c"].map((name) =>
        readFile(join(root, `${name}.yaml`), "utf8"),
      ),
    );
    const settingsBefore = session.snapshot().settings;
    const seen: string[][] = [];
    session.subscribe("events", (snapshot) =>
      seen.push(snapshot.projects.map((p) => p.name)),
    );
    expect(
      await session.handleOperation({
        type: "moveProject",
        projectId: ids.c,
        targetProjectId: ids.a,
        placement: "before",
      }),
    ).toEqual({ ok: true });
    expect(seen.at(-1)).toEqual(["c", "a", "b"]);
    expect(
      await session.handleOperation({
        type: "moveProject",
        projectId: ids.c,
        targetProjectId: ids.b,
        placement: "after",
      }),
    ).toEqual({ ok: true });
    expect(session.snapshot().projects.map((p) => p.name)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(
      await session.handleOperation({
        type: "moveProject",
        projectId: ids.a,
        targetProjectId: ids.c,
        placement: "after",
      }),
    ).toEqual({ ok: true });
    const reopened = new BoardSession(path);
    await reopened.reload();
    expect(reopened.snapshot().projects.map((p) => p.name)).toEqual([
      "b",
      "c",
      "a",
    ]);
    expect(reopened.snapshot().projectEntries.map((p) => p.file)).toEqual([
      "b.yaml",
      "hidden.yaml",
      "c.yaml",
      "a.yaml",
    ]);
    const saved = await readFile(path, "utf8");
    expect(saved).toContain("# 管理設定");
    expect(saved).toContain("# Alphaの設定");
    expect(saved).toContain("# Alphaの行");
    expect(
      await Promise.all(
        ["a", "hidden", "b", "c"].map((name) =>
          readFile(join(root, `${name}.yaml`), "utf8"),
        ),
      ),
    ).toEqual(projectBefore);
    expect(reopened.snapshot().settings).toEqual(settingsBefore);
    expect(reopened.snapshot().projectEntries.map((p) => p.load)).toEqual([
      true,
      false,
      true,
      true,
    ]);
  });

  it("REQ-032-S04 不正・非表示・削除済みの対象は管理ファイルを変更せず拒否する", async () => {
    const { path, session, ids } = await fixture();
    const before = await readFile(path, "utf8");
    for (const operation of [
      { projectId: ids.hidden, targetProjectId: ids.a, placement: "before" },
      { projectId: ids.a, targetProjectId: randomUUID(), placement: "after" },
      { projectId: ids.a, targetProjectId: ids.c, placement: "invalid" },
    ]) {
      expect(
        (await session.handleOperation({ type: "moveProject", ...operation }))
          .ok,
      ).toBe(false);
      expect(await readFile(path, "utf8")).toBe(before);
    }
  });
});

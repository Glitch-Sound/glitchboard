import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BoardSession } from "../../packages/extension/src/session.js";

describe("REQ-013-S01 外部変更", () => {
  it("Event削除時に両画面へ同じ版を配信し選択を解除する", async () => {
    const root = await mkdtemp(join(tmpdir(), "glitchboard-shell-"));
    const project = join(root, "project.yaml");
    const manage = join(root, "manage.yaml");
    await writeFile(
      manage,
      "settings: {workdays_off: [], public_holidays: false}\nprojects: [{file: project.yaml, load: true}]\n",
    );
    const event =
      "{id: 11111111-1111-4111-8111-111111111111, name: Release, due: 2026-11-10, stories: []}";
    const base = (events: string) =>
      `id: 22222222-2222-4222-8222-222222222222\nname: Alpha\ncolor: '#123456'\nevents: ${events}\n`;
    await writeFile(project, base(`[${event}]`));
    const session = new BoardSession(manage);
    const board: number[] = [];
    const sidebar: number[] = [];
    session.subscribe("board", (snapshot) => board.push(snapshot.version));
    session.subscribe("events", (snapshot) => sidebar.push(snapshot.version));
    await session.reload();
    session.selectEvent("11111111-1111-4111-8111-111111111111");
    await writeFile(project, base("[]"));
    await session.reload();
    expect(session.snapshot().selectedEventId).toBeNull();
    expect(session.snapshot().projects[0]?.events).toHaveLength(0);
    expect(board.at(-1)).toBe(sidebar.at(-1));
  });
});

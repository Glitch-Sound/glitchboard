import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BoardSession } from "../../packages/extension/src/session.js";

afterEach(() => vi.useRealTimers());

describe("REQ-018 初期Event選択", () => {
  it("期限順で最初の危険なEventを選び、なければ直近を選ぶ", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-03T03:00:00Z"));
    const root = await mkdtemp(join(tmpdir(), "glitchboard-selection-"));
    const manage = join(root, "manage.yaml");
    const project = join(root, "project.yaml");
    await writeFile(
      manage,
      "settings: {workdays_off: [sat, sun], public_holidays: true}\nprojects: [{file: project.yaml, load: true}]\n",
    );
    const event = (id: string, due: string) =>
      `{id: ${id}, name: ${id}, due: ${due}, stories: []}`;
    const first = "11111111-1111-4111-8111-111111111111";
    const urgent = "22222222-2222-4222-8222-222222222222";
    const later = "33333333-3333-4333-8333-333333333333";
    const save = (events: string[]) =>
      writeFile(
        project,
        `id: 44444444-4444-4444-8444-444444444444\nname: Alpha\ncolor: '#123456'\nevents: [${events.join(", ")}]\n`,
      );
    await save([
      event(first, "2026-11-10"),
      event(later, "2026-11-09"),
      event(urgent, "2026-11-02"),
    ]);
    const session = new BoardSession(manage);
    await session.reload();
    expect(session.snapshot().selectedEventId).toBe(urgent);
    await save([event(first, "2026-11-10"), event(later, "2026-11-09")]);
    await session.reload();
    expect(session.snapshot().selectedEventId).toBe(later);
  });
});

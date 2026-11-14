import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { BoardSession } from "../../packages/extension/src/session.js";
import { operationSchema } from "../../packages/shared/src/domain/messages.js";

const eventId = "22222222-2222-4222-8222-222222222222";
it("REQ-035-S05: 選択解除の null と既存 UUID を許可し、他の無効値を拒否する", () => {
  expect(operationSchema.parse({ type: "selectEvent", eventId: null })).toEqual(
    {
      type: "selectEvent",
      eventId: null,
    },
  );
  expect(operationSchema.parse({ type: "selectEvent", eventId })).toEqual({
    type: "selectEvent",
    eventId,
  });
  for (const value of [undefined, "", 0, false]) {
    expect(
      operationSchema.safeParse({ type: "selectEvent", eventId: value })
        .success,
    ).toBe(false);
  }
});

it("REQ-035-S05: 選択解除を両面へ配信し、反復してもファイルを変更しない", async () => {
  const root = await mkdtemp(join(tmpdir(), "gb-clear-selection-"));
  try {
    const manage = join(root, "manage.yaml"),
      project = join(root, "A.yaml");
    const management = JSON.stringify({
      settings: { workdays_off: [], public_holidays: false },
      projects: [{ file: "A.yaml", load: true }],
    });
    const source = JSON.stringify({
      id: "11111111-1111-4111-8111-111111111111",
      name: "A",
      color: "#123456",
      events: [
        {
          id: eventId,
          name: "Event",
          due: "2026-11-20",
          tasks: [],
          stories: [],
        },
      ],
    });
    await writeFile(manage, management);
    await writeFile(project, source);
    const session = new BoardSession(manage);
    await session.reload();
    session.selectEvent(eventId, "A.yaml");
    const received = { board: [] as unknown[], events: [] as unknown[] };
    const unsubs = (Object.keys(received) as (keyof typeof received)[]).map(
      (surface) =>
        session.subscribe(surface, (snapshot) =>
          received[surface].push({
            eventId: snapshot.selectedEventId,
            projectFile: snapshot.selectedProjectFile,
          }),
        ),
    );
    for (let index = 0; index < 2; index++) {
      expect(
        await session.handleOperation({ type: "selectEvent", eventId: null }),
      ).toEqual({ ok: true });
      expect(received.board.at(-1)).toEqual({
        eventId: null,
        projectFile: null,
      });
      expect(received.events.at(-1)).toEqual({
        eventId: null,
        projectFile: null,
      });
    }
    expect(await readFile(manage, "utf8")).toBe(management);
    expect(await readFile(project, "utf8")).toBe(source);
    unsubs.forEach((unsubscribe) => {
      unsubscribe();
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { BoardSession } from "../../packages/extension/src/session.js";
import { parseProjectYaml } from "../../packages/extension/src/storage/project.js";
import { projectSchema } from "../../packages/shared/src/domain/index.js";
import { operationSchema } from "../../packages/shared/src/domain/messages.js";

const project = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Alpha",
  color: "#123456",
  events: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      name: "Launch",
      due: "2099-11-20",
      note: "Event note",
      tasks: [
        {
          id: "44444444-4444-4444-8444-444444444444",
          name: "Direct",
          points: 3,
        },
      ],
      stories: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          name: "Work",
          tasks: [
            {
              id: "55555555-5555-4555-8555-555555555555",
              name: "Grouped",
              doneAt: "2026-11-10",
            },
          ],
        },
      ],
    },
  ],
  note: "Project note",
};
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
async function fixture(archived?: unknown) {
  const root = await mkdtemp(join(tmpdir(), "gb-archive-"));
  roots.push(root);
  const manage = join(root, "manage.yaml");
  const source = `# Project comment\n${JSON.stringify({ ...project, custom: "preserved", ...(archived === undefined ? {} : { archived }) }, null, 2)}\n`;
  await writeFile(
    manage,
    "settings: {workdays_off: [], public_holidays: false}\nprojects: [{file: A.yaml, load: true}, {file: B.yaml, load: true}]\n",
  );
  await Promise.all(
    ["A", "B"].map((name) => writeFile(join(root, `${name}.yaml`), source)),
  );
  const session = new BoardSession(manage);
  await session.reload();
  return { root, manage, source, session };
}

it("REQ-047-S02 archived は任意の真偽値で、文字列を拒否する", () => {
  for (const value of [undefined, false, true]) {
    const parsed = projectSchema.parse({
      ...project,
      ...(value === undefined ? {} : { archived: value }),
    });
    expect(parsed).toEqual({
      ...project,
      ...(value === undefined ? {} : { archived: value }),
    });
  }
  expect(
    projectSchema.safeParse({ ...project, archived: "true" }).success,
  ).toBe(false);
});
it("REQ-047-S02 読込だけでは未設定属性を補わない", async () => {
  const { root, source, session } = await fixture();
  await session.reload();
  expect(await readFile(join(root, "B.yaml"), "utf8")).toBe(source);
  expect(session.snapshot().projects[1]).not.toHaveProperty("archived");
});
it("REQ-047-S01 同じUUIDのBだけをアーカイブし再起動後も子、選択と管理設定を保持する", async () => {
  const { root, manage, source, session } = await fixture();
  await session.handleOperation({
    type: "selectEvent",
    projectFile: "B.yaml",
    eventId: project.events[0].id,
  });
  const before = session.snapshot();
  const manageSource = await readFile(manage, "utf8");
  expect(
    await session.handleOperation({
      type: "editItem",
      kind: "project",
      projectFile: "B.yaml",
      id: project.id,
      patch: { archived: true },
    }),
  ).toEqual({ ok: true });
  const bytes = await readFile(join(root, "B.yaml"), "utf8");
  expect(bytes).toContain("# Project comment");
  expect(bytes).toContain("preserved");
  expect(parseProjectYaml(bytes)).toEqual({ ...project, archived: true });
  expect(await readFile(join(root, "A.yaml"), "utf8")).toBe(source);
  expect(await readFile(manage, "utf8")).toBe(manageSource);
  expect(session.snapshot()).toMatchObject({
    selectedEventId: before.selectedEventId,
    selectedProjectFile: "B.yaml",
  });
  const restarted = new BoardSession(manage);
  await restarted.reload();
  expect(restarted.snapshot().projects).toEqual([
    { ...project, sourceFile: "A.yaml" },
    { ...project, archived: true, sourceFile: "B.yaml" },
  ]);
});
it("REQ-047-S02 復元要求とProject以外のアーカイブ要求はファイルを変更しない", async () => {
  const { root, source, session } = await fixture();
  expect(
    operationSchema.safeParse({
      type: "editItem",
      kind: "project",
      id: project.id,
      patch: { archived: false },
    }).success,
  ).toBe(false);
  for (const [kind, id] of [
    ["event", project.events[0].id],
    ["story", project.events[0].stories[0].id],
    ["task", project.events[0].tasks[0].id],
  ]) {
    expect(
      await session.handleOperation({
        type: "editItem",
        kind,
        id,
        projectFile: "B.yaml",
        patch: { archived: true },
      }),
    ).toMatchObject({ ok: false });
  }
  expect(await readFile(join(root, "B.yaml"), "utf8")).toBe(source);
});

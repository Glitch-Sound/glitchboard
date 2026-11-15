import { mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";

const disk = vi.hoisted(() => ({ fail: false }));
vi.mock("node:fs/promises", async (original) => {
  const fs = await original<typeof import("node:fs/promises")>();
  return {
    ...fs,
    rename: vi.fn(async (...args: Parameters<typeof fs.rename>) => {
      if (disk.fail) {
        disk.fail = false;
        throw new Error("EACCES: rename失敗");
      }
      return fs.rename(...args);
    }),
  };
});

import { reorderChild } from "../../packages/extension/src/storage/reorder.js";

it("REQ-045-S05 rename失敗は元のYAMLを保ち、再操作で保存できる", async () => {
  const root = await mkdtemp(join(tmpdir(), "gb-reorder-failure-"));
  const path = join(root, "project.yaml");
  try {
    const source = await readFile(
      "examples/readme-guide/projects/0001_Webサイト.yaml",
      "utf8",
    );
    await writeFile(path, source);
    const op = {
      type: "moveTask" as const,
      eventId: "00000000-0000-4000-8000-000000000002",
      storyId: null,
      taskId: "00000000-0000-4000-8000-000000000003",
      targetTaskId: "00000000-0000-4000-8000-000000000004",
      placement: "after" as const,
    };
    disk.fail = true;
    await expect(reorderChild(path, op)).rejects.toThrow("EACCES: rename失敗");
    expect(await readFile(path, "utf8")).toBe(source);
    await reorderChild(path, op);
    expect(await readFile(path, "utf8")).not.toBe(source);
    expect(rename).toHaveBeenCalledTimes(2);
  } finally {
    disk.fail = false;
    await rm(root, { recursive: true, force: true });
  }
});

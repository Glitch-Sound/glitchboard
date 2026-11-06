import { z } from "zod";
import { projectSchema } from "./index.js";
import { manageSchema } from "./manage.js";

/** REQ-013: Extensionから両Webviewへ配信する版番号付き状態を検証する。 */
export const snapshotMessageSchema = z.object({
  type: z.literal("snapshot"),
  payload: z.object({
    version: z.number().int().nonnegative(),
    projects: z.array(projectSchema),
    selectedEventId: z.uuid().nullable(),
    error: z.string().nullable(),
    settings: manageSchema.shape.settings,
    projectEntries: z.array(
      z.object({
        file: z.string().min(1),
        load: z.boolean(),
        name: z.string(),
        color: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional(),
      }),
    ),
  }),
});

export type Snapshot = z.infer<typeof snapshotMessageSchema>["payload"];

/** REQ-014: Webviewから受ける編集要求の共有スキーマ。 */
export const operationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("updateTask"),
    taskId: z.uuid(),
    points: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(5),
      z.literal(8),
      z.literal(13),
      z.literal(21),
      z.null(),
    ]),
  }),
  z.object({
    type: z.literal("setTaskDone"),
    taskId: z.uuid(),
    done: z.boolean(),
  }),
  z.object({
    type: z.literal("deleteItem"),
    kind: z.enum(["project", "event", "story", "task"]),
    id: z.uuid(),
    version: z.number().int().nonnegative(),
    expected: z.object({
      events: z.number().int().nonnegative(),
      stories: z.number().int().nonnegative(),
      tasks: z.number().int().nonnegative(),
    }),
  }),
  z.object({
    type: z.literal("editItem"),
    kind: z.enum(["project", "event", "story", "task"]),
    id: z.uuid(),
    patch: z
      .strictObject({
        name: z.string().trim().min(1).optional(),
        due: z.string().optional(),
        color: z.string().optional(),
        points: z
          .union([
            z.literal(1),
            z.literal(2),
            z.literal(3),
            z.literal(5),
            z.literal(8),
            z.literal(13),
            z.literal(21),
            z.null(),
          ])
          .optional(),
        note: z.string().optional(),
      })
      .refine((value) => Object.keys(value).length > 0),
  }),
  z.object({
    type: z.literal("setProjectLoaded"),
    file: z.string().min(1),
    load: z.boolean(),
  }),
  z.object({ type: z.literal("selectEvent"), eventId: z.uuid() }),
  z.object({
    type: z.literal("createProject"),
    name: z.string().trim().min(1),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
  z.object({
    type: z.literal("addEvent"),
    projectId: z.uuid(),
    name: z.string().trim().min(1),
    due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  z.object({
    type: z.literal("addStory"),
    eventId: z.uuid(),
    name: z.string().trim().min(1),
  }),
  z.object({
    type: z.literal("addTask"),
    storyId: z.uuid(),
    name: z.string().trim().min(1),
  }),
]);
export type Operation = z.infer<typeof operationSchema>;

/** REQ-014/REQ-029: 初期設定操作も共有境界で検証する。 */
export const setupOperationSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("chooseManage"),
    requestId: z.number().int().positive().optional(),
  }),
  z.strictObject({
    type: z.literal("createManage"),
    requestId: z.number().int().positive().optional(),
  }),
]);

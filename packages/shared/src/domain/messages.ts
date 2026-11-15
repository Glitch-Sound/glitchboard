import { z } from "zod";
import { projectSchema } from "./index.js";
import { manageSchema } from "./manage.js";

/** REQ-013/REQ-029: Extensionから両Webviewへ配信する版番号付き状態と不在情報を検証する。 */
export const snapshotMessageSchema = z.object({
  type: z.literal("snapshot"),
  payload: z.object({
    version: z.number().int().nonnegative(),
    connectionId: z.string().min(1).optional(),
    projects: z.array(
      projectSchema.extend({ sourceFile: z.string().min(1).optional() }),
    ),
    selectedEventId: z.uuid().nullable(),
    selectedProjectFile: z.string().min(1).nullable().optional(),
    error: z.string().nullable(),
    manageAvailability: z
      .discriminatedUnion("status", [
        z.object({ status: z.literal("ready") }),
        z.object({ status: z.literal("missing"), path: z.string().min(1) }),
      ])
      .optional(),
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
    type: z.literal("moveStory"),
    projectFile: z.string().min(1).optional(),
    targetProjectFile: z.string().min(1).optional(),
    eventId: z.uuid(),
    storyId: z.uuid(),
    targetStoryId: z.uuid(),
    placement: z.enum(["before", "after"]),
  }),
  z.object({
    type: z.literal("moveTask"),
    projectFile: z.string().min(1).optional(),
    targetProjectFile: z.string().min(1).optional(),
    eventId: z.uuid(),
    storyId: z.uuid().nullable(),
    taskId: z.uuid(),
    targetTaskId: z.uuid(),
    placement: z.enum(["before", "after"]),
  }),
  z.object({
    type: z.literal("updateTask"),
    projectFile: z.string().min(1).optional(),
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
    projectFile: z.string().min(1).optional(),
    taskId: z.uuid(),
    done: z.boolean(),
  }),
  z.object({
    type: z.literal("deleteItem"),
    projectFile: z.string().min(1).optional(),
    kind: z.enum(["project", "event", "story", "task"]),
    id: z.uuid(),
    version: z.number().int().nonnegative(),
    connectionId: z.string().min(1).optional(),
    expected: z.object({
      events: z.number().int().nonnegative(),
      stories: z.number().int().nonnegative(),
      tasks: z.number().int().nonnegative(),
    }),
  }),
  z.object({
    type: z.literal("editItem"),
    projectFile: z.string().min(1).optional(),
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
  z.object({
    type: z.literal("selectEvent"),
    openDetail: z.boolean().optional(),
    projectFile: z.string().min(1).optional(),
    eventId: z.uuid().nullable(),
  }),
  z.object({
    type: z.literal("createProject"),
    name: z.string().trim().min(1),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
  z.object({
    // REQ-032-S04: UUIDと移動方向を共有境界で検証する。
    type: z.literal("moveProject"),
    projectFile: z.string().min(1).optional(),
    projectId: z.uuid(),
    targetProjectId: z.uuid(),
    targetProjectFile: z.string().min(1).optional(),
    placement: z.enum(["before", "after"]),
  }),
  z.object({
    type: z.literal("addEvent"),
    projectFile: z.string().min(1).optional(),
    projectId: z.uuid(),
    name: z.string().trim().min(1),
    due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  z.object({
    type: z.literal("addStory"),
    projectFile: z.string().min(1).optional(),
    eventId: z.uuid(),
    name: z.string().trim().min(1),
  }),
  z.object({
    type: z.literal("addEventTask"),
    projectFile: z.string().min(1).optional(),
    eventId: z.uuid(),
    name: z.string().trim().min(1),
  }),
  z.object({
    type: z.literal("addTask"),
    projectFile: z.string().min(1).optional(),
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

/** 左ペインからの移動はボードで編集保護を行ってから確定する。 */
export const navigationMessageSchema = z.object({
  type: z.literal("navigateRecord"),
  payload: z.object({
    kind: z.literal("event"),
    connectionId: z.string().min(1).optional(),
    id: z.uuid(),
    projectFile: z.string().min(1).optional(),
    openDetail: z.boolean(),
  }),
});

/** REQ-013: 接続先を確定する前にボードの未保存入力を解決する。 */
export const connectionChangeRequestSchema = z.strictObject({
  type: z.literal("prepareConnectionChange"),
  requestId: z.number().int().positive(),
});
export const connectionChangeResultSchema = z.strictObject({
  type: z.literal("connectionChangeResult"),
  requestId: z.number().int().positive(),
  ok: z.boolean(),
});

/** 表示時の接続を要求に結び、遅延した操作の誤配送を防ぐ。 */
export const operationConnectionSchema = z.object({
  connectionId: z.string().min(1).optional(),
});

/** 接続確定と失敗のどちらでも一時的な入力停止を解除する。 */
export const connectionChangeSettledSchema = z.strictObject({
  type: z.literal("connectionChangeSettled"),
  requestId: z.number().int().positive(),
});

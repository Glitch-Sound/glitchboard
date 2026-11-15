import { z } from "zod";

/** REQ-040: UI 寸法を YAML の操作と分離して検証する。描画の範囲は UI の定義を使う。 */
export const timelineLayoutSchema = z.strictObject({
  width: z.number().finite().positive(),
  height: z.number().finite().positive(),
});
export type TimelineLayoutPreference = z.infer<typeof timelineLayoutSchema>;
export const saveTimelineLayoutSchema = z.strictObject({
  type: z.literal("saveTimelineLayout"),
  requestId: z.number().int().nonnegative(),
  layout: timelineLayoutSchema,
});
export const timelineLayoutResultSchema = z.discriminatedUnion("ok", [
  z.strictObject({
    type: z.literal("timelineLayoutResult"),
    requestId: z.number().int().nonnegative(),
    ok: z.literal(true),
  }),
  z.strictObject({
    type: z.literal("timelineLayoutResult"),
    requestId: z.number().int().nonnegative(),
    ok: z.literal(false),
    error: z.string(),
  }),
]);

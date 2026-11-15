import {
  type TimelineLayoutPreference,
  timelineLayoutSchema,
} from "../../../shared/src/domain/timeline-layout.js";

/** 既存の Webview 保存値を引き継ぎ、新しいパネルではプロファイル値を読む。 */
export function readTimelineLayout(
  state: unknown,
  encoded?: string,
): TimelineLayoutPreference | undefined {
  const previous = timelineLayoutSchema.safeParse(
    typeof state === "object" && state !== null && "timelineLayout" in state
      ? state.timelineLayout
      : undefined,
  );
  if (previous.success) return previous.data;
  if (!encoded) return undefined;
  try {
    const stored = timelineLayoutSchema.safeParse(JSON.parse(encoded));
    return stored.success ? stored.data : undefined;
  } catch {
    return undefined;
  }
}

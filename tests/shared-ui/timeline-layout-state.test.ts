import { expect, it } from "vitest";
import { timelineLayoutSchema } from "../../packages/shared/src/domain/timeline-layout.js";
import { readTimelineLayout } from "../../packages/webview/src/app/timeline-layout.js";

it.each(["280", Number.NaN, Number.POSITIVE_INFINITY, 0, -1])(
  "REQ-040-S13 寸法の不正な数値 %s を共有境界で拒否する",
  (width) => {
    expect(timelineLayoutSchema.safeParse({ width, height: 56 }).success).toBe(
      false,
    );
  },
);
it("REQ-040-S01 古い Webview の保存値を優先し、ない場合は検証済みのプロファイル値を使う", () => {
  expect(
    readTimelineLayout(
      { timelineLayout: { width: 240, height: 64 } },
      '{"width":320,"height":72}',
    ),
  ).toEqual({ width: 240, height: 64 });
  expect(readTimelineLayout({}, '{"width":320,"height":72}')).toEqual({
    width: 320,
    height: 72,
  });
  expect(readTimelineLayout({}, "broken")).toBeUndefined();
  expect(
    readTimelineLayout({}, '{"width":"wrong","height":72}'),
  ).toBeUndefined();
});

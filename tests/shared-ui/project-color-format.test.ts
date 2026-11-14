import { expect, it } from "vitest";
import {
  normalizeProjectColor,
  projectColorSchema,
} from "../../packages/shared/src/domain/color.js";

it.each([
  ["#12aBcD", "#12abcd"],
  ["  #A0B1C2\n", "#a0b1c2"],
  ["#000000", "#000000"],
  ["#abc", null],
  ["#11223344", null],
  ["red", null],
  ["", null],
  ["#12gh56", null],
  ["112233", null],
])("REQ-042-S01 %j の正規化結果を %j にする", (value, expected) => {
  expect(normalizeProjectColor(value)).toBe(expected);
});
it("REQ-042-S01 保存形式の検証は入力用の空白許容を持ち込まない", () => {
  expect(projectColorSchema.safeParse("#AaBbCc").success).toBe(true);
  expect(projectColorSchema.safeParse(" #aabbcc ").success).toBe(false);
});

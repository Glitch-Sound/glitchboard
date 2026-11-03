import { describe, expect, it } from "vitest";
import { setupOperationSchema } from "../../packages/shared/src/domain/messages.js";

describe("REQ-014 管理ファイル設定操作の検証", () => {
  it("選択・作成だけを受け入れ、不正な追加項目と要求IDを拒否する", () => {
    expect(
      setupOperationSchema.safeParse({ type: "chooseManage" }).success,
    ).toBe(true);
    expect(
      setupOperationSchema.safeParse({ type: "createManage", requestId: 1 })
        .success,
    ).toBe(true);
    expect(
      setupOperationSchema.safeParse({ type: "createManage", extra: true })
        .success,
    ).toBe(false);
    expect(
      setupOperationSchema.safeParse({ type: "chooseManage", requestId: "bad" })
        .success,
    ).toBe(false);
    expect(
      setupOperationSchema.safeParse({ type: "deleteManage" }).success,
    ).toBe(false);
  });
});

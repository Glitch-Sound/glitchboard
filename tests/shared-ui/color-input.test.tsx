// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import { ColorInput } from "../../packages/webview/src/shared/ui/color-input/index.js";

function Field() {
  const [value, setValue] = useState("#123456");
  return <ColorInput value={value} fallback="#123456" onChange={setValue} />;
}
afterEach(cleanup);
it("REQ-042-S03 無効な入力途中でも直前の有効なプレビューを保持する", () => {
  render(<Field />);
  const code = screen.getByRole("textbox", { name: "カラーコード" });
  fireEvent.change(code, { target: { value: "#abcdef" } });
  fireEvent.change(code, { target: { value: "#abcde" } });
  expect(screen.getByLabelText("色")).toHaveProperty("value", "#abcdef");
  expect(code).toHaveProperty("value", "#abcde");
  expect(screen.getByRole("alert").textContent).toBe(
    "カラーコードは # と6桁の16進数で入力してください。",
  );
});

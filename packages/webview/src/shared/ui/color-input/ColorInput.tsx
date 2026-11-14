import { useId, useRef } from "react";
import { normalizeProjectColor } from "../../../../../shared/src/domain/color.js";

export const hexColorError =
  "カラーコードは # と6桁の16進数で入力してください。";
/** REQ-042: 入力途中の値を保持し、有効な色だけプレビューする。 */
export function ColorInput({
  value,
  fallback,
  disabled,
  onChange,
  onPick,
  onCancel,
}: {
  value: string;
  fallback: string;
  disabled?: boolean;
  onChange(value: string): void;
  onPick?(color: string): void;
  onCancel?(): void;
}) {
  const hint = useId();
  const normalized = normalizeProjectColor(value);
  const lastValid = useRef(
    normalized ?? normalizeProjectColor(fallback) ?? "#000000",
  );
  if (normalized) lastValid.current = normalized;
  return (
    <div className="project-color-field">
      <div className="project-color-controls">
        <input
          type="color"
          aria-label="色"
          title="色を選択"
          disabled={disabled}
          value={normalized ?? lastValid.current}
          onChange={(event) => {
            onChange(event.target.value);
            onPick?.(event.target.value);
          }}
        />
        <input
          type="text"
          aria-label="カラーコード"
          aria-invalid={!normalized}
          aria-describedby={hint}
          placeholder="#RRGGBB"
          spellCheck={false}
          autoComplete="off"
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && onCancel && value !== fallback) {
              event.preventDefault();
              event.stopPropagation();
              onCancel();
            }
          }}
        />
      </div>
      <span
        id={hint}
        className={normalized ? "color-format-hint" : "color-input-error"}
        role={normalized ? undefined : "alert"}
      >
        {normalized ? "# + 6桁の16進数" : hexColorError}
      </span>
    </div>
  );
}

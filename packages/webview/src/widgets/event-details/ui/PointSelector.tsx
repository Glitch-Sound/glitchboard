import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { pointTone } from "../../../shared/lib/pointTone.js";

type Points = 1 | 2 | 3 | 5 | 8 | 13 | 21;
type Props = {
  points: Points | undefined;
  disabled?: boolean;
  onChange(points: Points | null): void;
};
const values: Points[] = [1, 2, 3, 5, 8, 13, 21];

/** REQ-023: 7つの許可値からTaskポイントを選ぶ。 */
export function PointSelector({ points, disabled = false, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  const menu = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (
        !root.current?.contains(event.target as Node) &&
        !menu.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    const onScroll = () => setOpen(false);
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);
  return (
    <span ref={root} className="point-selector">
      <button
        type="button"
        className={pointTone(points)}
        disabled={disabled}
        aria-expanded={open && !disabled}
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          const rect = root.current?.getBoundingClientRect();
          if (rect)
            setPosition({
              top:
                rect.bottom + 196 > window.innerHeight
                  ? Math.max(8, rect.top - 196)
                  : rect.bottom + 6,
              left: Math.max(
                8,
                Math.min(window.innerWidth - 286, rect.right - 278),
              ),
            });
          setOpen(true);
        }}
      >
        {points === undefined ? "未見積" : `${points}pt`}
      </button>
      {open &&
        !disabled &&
        createPortal(
          <span ref={menu} className="point-options" style={position}>
            <span className="point-options-header">
              <span>ポイント</span>
              <strong className={`point-current ${pointTone(points)}`}>
                {points === undefined ? "未見積" : `${points}pt`}
              </strong>
            </span>
            <input
              type="range"
              min="0"
              max={values.length - 1}
              step="1"
              value={Math.max(0, values.indexOf(points ?? 3))}
              aria-label="ポイントをスライダーで選択"
              onChange={(event) =>
                onChange(values[Number(event.target.value)] ?? 3)
              }
            />
            <span className="point-options-values">
              {values.map((value) => (
                <button
                  key={value}
                  className={pointTone(value)}
                  type="button"
                  aria-pressed={points === value}
                  onClick={() => {
                    onChange(value);
                    setOpen(false);
                  }}
                >
                  {value}
                </button>
              ))}
            </span>
            <button
              type="button"
              className="point-unestimated-option"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              未見積
            </button>
          </span>,
          document.body,
        )}
    </span>
  );
}

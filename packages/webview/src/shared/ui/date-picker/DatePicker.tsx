import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  addCalendarDays,
  todayInTokyo,
  utcDate,
} from "../../../../../shared/src/calculation/dates.js";
import { eventSchema } from "../../../../../shared/src/domain/index.js";
import { monthDays, moveMonth } from "./date-grid.js";

type Props = {
  value: string;
  onChange(value: string): void;
  open?: boolean;
  onOpenChange?(open: boolean): void;
  error?: string;
};
const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

/** REQ-022-S05/S06/S08/S09, REQ-027-S03/S04: 保存を行わない共通の暦日入力。 */
export function DatePicker({
  value,
  onChange,
  open: controlledOpen,
  onOpenChange,
  error,
}: Props) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const changeOpen = useCallback(
    (next: boolean) => {
      setLocalOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );
  const valid = eventSchema.shape.due.safeParse(value).success;
  const today = todayInTokyo();
  const initial = valid ? value : today;
  const [month, setMonth] = useState(initial.slice(0, 7));
  const [focused, setFocused] = useState(initial);
  const [position, setPosition] = useState({
    left: 8,
    top: 8,
    width: 280,
    maxHeight: 400,
  });
  const trigger = useRef<HTMLButtonElement>(null);
  const calendar = useRef<HTMLDivElement>(null);
  const id = useId();
  useLayoutEffect(() => {
    if (!open) return;
    setMonth(initial.slice(0, 7));
    setFocused(initial);
  }, [open, initial]);
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const anchor = trigger.current?.getBoundingClientRect();
      const popup = calendar.current?.getBoundingClientRect();
      if (!anchor || !popup) return;
      const width = Math.min(280, window.innerWidth - 16);
      const maxHeight = window.innerHeight - 16;
      const height = Math.min(popup.height, maxHeight);
      const top =
        anchor.bottom + 6 + height <= window.innerHeight - 8
          ? anchor.bottom + 6
          : Math.max(8, anchor.top - height - 6);
      setPosition({
        left: Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8)),
        top: Math.min(top, window.innerHeight - height - 8),
        width,
        maxHeight,
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);
  useLayoutEffect(() => {
    if (open)
      calendar.current
        ?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)
        ?.focus();
  }, [open, focused]);
  const close = useCallback(() => {
    changeOpen(false);
    trigger.current?.focus();
  }, [changeOpen]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !trigger.current?.contains(event.target) &&
        !calendar.current?.contains(event.target)
      )
        changeOpen(false);
    };
    // REQ-022-S06/REQ-027-S04: Tabで親フォームへ移動した後も、Escはカレンダーだけを閉じる。
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", handleEscape, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", handleEscape, true);
    };
  }, [open, changeOpen, close]);
  const select = (day: string) => {
    onChange(day);
    close();
  };
  return (
    <span className="date-picker">
      <input
        aria-label="期限"
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        type="text"
        placeholder="YYYY-MM-DD"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        ref={trigger}
        type="button"
        className="date-picker-trigger"
        aria-label={
          valid
            ? `期限 ${Number(value.slice(5, 7))}/${Number(value.slice(8, 10))}(${weekdays[utcDate(value).getUTCDay()]})`
            : "期限を選ぶ"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => changeOpen(!open)}
      >
        {valid
          ? `${Number(value.slice(5, 7))}/${Number(value.slice(8, 10))}(${weekdays[utcDate(value).getUTCDay()]})`
          : "期限を選ぶ"}
      </button>
      {error && (
        <span id={`${id}-error`} className="date-picker-error" role="alert">
          {error}
        </span>
      )}
      {open &&
        createPortal(
          <div
            ref={calendar}
            id={id}
            className="date-picker-calendar"
            role="dialog"
            aria-label="期限のカレンダー"
            style={position}
          >
            <div className="date-picker-heading">
              <button
                type="button"
                aria-label="前月"
                onClick={() => setMonth(moveMonth(month, -1))}
              >
                ‹
              </button>
              <strong aria-live="polite">
                {Number(month.slice(0, 4))}年{Number(month.slice(5))}月
              </strong>
              <button
                type="button"
                aria-label="翌月"
                onClick={() => setMonth(moveMonth(month, 1))}
              >
                ›
              </button>
            </div>
            <div className="date-picker-grid">
              {weekdays.map((day) => (
                <span className="date-picker-weekday" key={day}>
                  {day}
                </span>
              ))}
              {monthDays(month).map((day) => (
                <button
                  key={day}
                  data-date={day}
                  data-other-month={!day.startsWith(month)}
                  type="button"
                  aria-label={day}
                  aria-pressed={day === value}
                  aria-current={day === today ? "date" : undefined}
                  tabIndex={
                    day ===
                    (focused.startsWith(month) ? focused : `${month}-01`)
                      ? 0
                      : -1
                  }
                  onClick={() => select(day)}
                  onKeyDown={(event) => {
                    const delta = {
                      ArrowLeft: -1,
                      ArrowRight: 1,
                      ArrowUp: -7,
                      ArrowDown: 7,
                    }[event.key];
                    if (delta !== undefined) {
                      event.preventDefault();
                      event.stopPropagation();
                      const next = addCalendarDays(day, delta);
                      setMonth(next.slice(0, 7));
                      setFocused(next);
                    }
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      select(day);
                    }
                  }}
                >
                  {Number(day.slice(8))}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </span>
  );
}

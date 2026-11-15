import {
  type CSSProperties,
  createContext,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { timelineDimensions as dimensions } from "../model/dimensions.js";

export type TimelineLayout = { width: number; height: number };
type Axis = keyof TimelineLayout;
type Pointer = PointerEvent<HTMLHRElement>;
type Controls = {
  layout: TimelineLayout;
  widthMax: number;
  displayWidth: number;
  active: string | null;
  region: string;
  start(event: Pointer, axis: Axis, rows: number, id: string): void;
  move(event: Pointer, id: string): void;
  finish(event: Pointer, id: string, cancel: boolean): void;
  blur(axis: Axis, id: string): void;
  key(event: KeyboardEvent, axis: Axis): void;
  reset(axis: Axis): void;
};
const LayoutContext = createContext<Controls | null>(null);
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
const valid = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

/** REQ-040: 全セルの境界で共有し、製品データと分離して寸法を保持する。 */
export function TimelineFrame({
  children,
  initialLayout,
  onLayoutChange,
}: {
  children: ReactNode;
  initialLayout?: Partial<TimelineLayout>;
  onLayoutChange?: (layout: TimelineLayout) => void;
}) {
  const [layout, setLayout] = useState<TimelineLayout>(() => ({
    width: clamp(
      valid(initialLayout?.width, dimensions.width.initial),
      dimensions.width.min,
      dimensions.width.max,
    ),
    height: clamp(
      valid(initialLayout?.height, dimensions.height.initial),
      dimensions.height.min,
      dimensions.height.max,
    ),
  }));
  const current = useRef(layout);
  const [available, setAvailable] = useState(Number.POSITIVE_INFINITY);
  const container = useRef<HTMLDivElement>(null);
  const origins = useRef<Partial<TimelineLayout>>({});
  const drag = useRef<{
    id: string;
    pointer: number;
    owner: HTMLHRElement;
    axis: Axis;
    coordinate: number;
    value: number;
    rows: number;
    origin: TimelineLayout;
  } | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const region = useId();
  useEffect(() => {
    if (!container.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() =>
      setAvailable(container.current?.clientWidth ?? Number.POSITIVE_INFINITY),
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const widthMax = Math.max(
    dimensions.width.min,
    Math.min(dimensions.width.max, available - dimensions.dateMinimum),
  );
  const commit = (next: TimelineLayout) => {
    if (
      next.width === current.current.width &&
      next.height === current.current.height
    )
      return;
    current.current = next;
    setLayout(next);
    onLayoutChange?.(next);
  };
  const change = (axis: Axis, value: number) =>
    commit({
      ...current.current,
      [axis]: clamp(
        value,
        dimensions[axis].min,
        axis === "width" ? widthMax : dimensions.height.max,
      ),
    });
  const finish = (cancel: boolean) => {
    const previous = drag.current;
    if (!previous) return;
    drag.current = null;
    setActive(null);
    if (cancel) commit(previous.origin);
    delete origins.current[previous.axis];
    if (previous.owner.hasPointerCapture(previous.pointer))
      previous.owner.releasePointerCapture(previous.pointer);
  };
  const reset = (axis: Axis) => {
    finish(false);
    delete origins.current[axis];
    change(axis, dimensions[axis].initial);
  };
  const controls: Controls = {
    layout,
    widthMax,
    displayWidth: Math.min(layout.width, widthMax),
    active,
    region,
    start(event, axis, rows, id) {
      event.stopPropagation();
      if (event.button !== 0 || drag.current) return;
      event.preventDefault();
      event.currentTarget.focus({ preventScroll: true });
      event.currentTarget.setPointerCapture(event.pointerId);
      delete origins.current[axis];
      drag.current = {
        id,
        pointer: event.pointerId,
        owner: event.currentTarget,
        axis,
        coordinate: axis === "width" ? event.clientX : event.clientY,
        value:
          axis === "width"
            ? Math.min(current.current.width, widthMax)
            : current.current.height,
        rows,
        origin: current.current,
      };
      setActive(id);
    },
    move(event, id) {
      const previous = drag.current;
      if (
        !previous ||
        previous.id !== id ||
        previous.pointer !== event.pointerId
      )
        return;
      const coordinate =
        previous.axis === "width" ? event.clientX : event.clientY;
      change(
        previous.axis,
        Math.round(
          previous.value + (coordinate - previous.coordinate) / previous.rows,
        ),
      );
    },
    finish(event, id, cancel) {
      if (drag.current?.id === id && drag.current.pointer === event.pointerId)
        finish(cancel);
    },
    blur(axis, id) {
      if (drag.current?.id === id) finish(true);
      delete origins.current[axis];
    },
    key(event, axis) {
      const positive = axis === "width" ? "ArrowRight" : "ArrowDown";
      const negative = axis === "width" ? "ArrowLeft" : "ArrowUp";
      if (![positive, negative, "Home", "End", "Escape"].includes(event.key))
        return;
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Escape") {
        if (drag.current) finish(true);
        else {
          const origin = origins.current[axis];
          if (origin !== undefined)
            commit({ ...current.current, [axis]: origin });
          delete origins.current[axis];
        }
      } else if (event.key === "Home") reset(axis);
      else if (!drag.current) {
        origins.current[axis] ??= current.current[axis];
        change(
          axis,
          event.key === "End"
            ? axis === "width"
              ? widthMax
              : dimensions.height.max
            : (axis === "width"
                ? Math.min(current.current.width, widthMax)
                : current.current.height) +
                (event.key === positive ? dimensions.step : -dimensions.step),
        );
      }
    },
    reset,
  };
  return (
    <LayoutContext value={controls}>
      <div
        id={region}
        className={`timeline-layout${active ? " timeline-resizing" : ""}`}
        ref={container}
        style={
          {
            "--timeline-min-width": `${dimensions.width.min + dimensions.dateMinimum}px`,
            "--project-width": `${controls.displayWidth}px`,
            "--project-row-height": `${layout.height}px`,
          } as CSSProperties
        }
      >
        {children}
      </div>
    </LayoutContext>
  );
}

/** 同じ寸法を操作する代表だけを Tab 停止にし、全セルでポインター操作を提供する。 */
export function TimelineResizeHandle({
  axis,
  label,
  tabIndex = -1,
  rows = 1,
}: {
  axis: Axis;
  label: string;
  tabIndex?: number;
  rows?: number;
}) {
  const controls = useContext(LayoutContext);
  const id = useId();
  if (!controls) return null;
  const value =
    axis === "width" ? controls.displayWidth : controls.layout.height;
  const keys = axis === "width" ? "左右キー" : "上下キー";
  return (
    <span
      className={`timeline-cell-resize timeline-cell-resize-${axis}${controls.active === id ? " resizing" : ""}`}
    >
      <hr
        tabIndex={tabIndex}
        aria-label={label}
        aria-orientation={axis === "width" ? "vertical" : "horizontal"}
        aria-controls={controls.region}
        aria-valuemin={dimensions[axis].min}
        aria-valuemax={
          axis === "width" ? controls.widthMax : dimensions.height.max
        }
        aria-valuenow={value}
        aria-valuetext={`${Math.round(value)}px`}
        title={`${axis === "width" ? "列幅" : "全Projectの行高"}: ${Math.round(value)}px。ドラッグか${keys}で調整、Homeかダブルクリックで初期化、Escで取消`}
        onPointerDown={(event) => controls.start(event, axis, rows, id)}
        onPointerMove={(event) => controls.move(event, id)}
        onPointerUp={(event) => {
          controls.move(event, id);
          controls.finish(event, id, false);
        }}
        onPointerCancel={(event) => controls.finish(event, id, true)}
        onLostPointerCapture={(event) => controls.finish(event, id, true)}
        onBlur={() => controls.blur(axis, id)}
        onKeyDown={(event) => controls.key(event, axis)}
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => {
          event.stopPropagation();
          controls.reset(axis);
        }}
        onDragStart={(event) => event.preventDefault()}
      />
      <output aria-hidden="true">{Math.round(value)}px</output>
    </span>
  );
}

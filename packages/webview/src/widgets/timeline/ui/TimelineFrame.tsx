import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import { timelineDimensions } from "../model/dimensions.js";

export type TimelineLayout = { width: number; height: number };
type Props = {
  children: ReactNode;
  initialLayout?: Partial<TimelineLayout>;
  onLayoutChange?: (layout: TimelineLayout) => void;
};
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
const valid = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
/** REQ-040: 製品データから独立した、全行共通の寸法を調整する。 */
export function TimelineFrame({
  children,
  initialLayout,
  onLayoutChange,
}: Props) {
  const [layout, setLayout] = useState<TimelineLayout>(() => ({
    width: clamp(
      valid(initialLayout?.width, timelineDimensions.width.initial),
      timelineDimensions.width.min,
      timelineDimensions.width.max,
    ),
    height: clamp(
      valid(initialLayout?.height, timelineDimensions.height.initial),
      timelineDimensions.height.min,
      timelineDimensions.height.max,
    ),
  }));
  const [available, setAvailable] = useState(Number.POSITIVE_INFINITY);
  const container = useRef<HTMLDivElement>(null);
  const origins = useRef<Partial<TimelineLayout>>({});
  useEffect(() => {
    if (!container.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() =>
      setAvailable(container.current?.clientWidth ?? Number.POSITIVE_INFINITY),
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const widthMax = Math.max(
    timelineDimensions.width.min,
    Math.min(
      timelineDimensions.width.max,
      available - timelineDimensions.dateMinimum,
    ),
  );
  const change = (key: keyof TimelineLayout, value: number) => {
    const next = {
      ...layout,
      [key]: clamp(
        value,
        timelineDimensions[key].min,
        key === "width" ? widthMax : timelineDimensions.height.max,
      ),
    };
    setLayout(next);
    onLayoutChange?.(next);
  };
  return (
    <div
      className="timeline-layout"
      ref={container}
      style={
        {
          "--timeline-min-width": `${timelineDimensions.width.min + timelineDimensions.dateMinimum}px`,
          "--project-width": `${Math.min(layout.width, widthMax)}px`,
          "--project-row-height": `${layout.height}px`,
        } as CSSProperties
      }
    >
      <fieldset className="timeline-dimensions" aria-label="タイムラインの寸法">
        {(["width", "height"] as const).map((key) => (
          <label key={key}>
            {key === "width" ? "列幅" : "行高"}
            <input
              type="range"
              aria-label={key === "width" ? "Project列幅" : "Project行高"}
              min={timelineDimensions[key].min}
              max={key === "width" ? widthMax : timelineDimensions.height.max}
              step="1"
              value={
                key === "width"
                  ? Math.min(layout.width, widthMax)
                  : layout.height
              }
              onPointerDown={() => {
                origins.current[key] = layout[key];
              }}
              onPointerUp={() => {
                delete origins.current[key];
              }}
              onPointerCancel={() => {
                const origin = origins.current[key];
                if (origin !== undefined) change(key, origin);
                delete origins.current[key];
              }}
              onBlur={() => {
                delete origins.current[key];
              }}
              onChange={(event) => change(key, Number(event.target.value))}
              onDoubleClick={() => change(key, timelineDimensions[key].initial)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  if (origins.current[key] !== undefined)
                    change(key, origins.current[key]);
                  delete origins.current[key];
                } else if (event.key === "Home") {
                  event.preventDefault();
                  change(key, timelineDimensions[key].initial);
                } else if (
                  ["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"].includes(
                    event.key,
                  )
                ) {
                  event.preventDefault();
                  origins.current[key] ??= layout[key];
                  change(
                    key,
                    layout[key] +
                      (["ArrowUp", "ArrowRight"].includes(event.key)
                        ? timelineDimensions.step
                        : -timelineDimensions.step),
                  );
                }
              }}
            />
            <output>
              {Math.round(
                key === "width"
                  ? Math.min(layout.width, widthMax)
                  : layout.height,
              )}
              px
            </output>
          </label>
        ))}
      </fieldset>
      {children}
    </div>
  );
}

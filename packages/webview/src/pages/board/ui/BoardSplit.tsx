import { type ReactNode, useRef, useState } from "react";

/** REQ-031-S01〜S05: 上下の領域を比率で分割し、境界の操作と取消を扱う。 */
export function BoardSplit({ children }: { children: [ReactNode, ReactNode] }) {
  const [ratio, setRatio] = useState(0.6);
  const [resizing, setResizing] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; ratio: number } | null>(null);
  const clamp = (value: number) => {
    const height = (container.current?.clientHeight ?? 0) - 12;
    const minimum = height > 0 ? Math.min(0.4, 80 / height) : 0.1;
    return Math.max(minimum, Math.min(1 - minimum, value));
  };
  return (
    <div
      ref={container}
      className={`board-content${resizing ? " board-resizing" : ""}`}
      style={{
        gridTemplateRows: `minmax(0, ${ratio}fr) 12px minmax(0, ${1 - ratio}fr)`,
      }}
    >
      {children[0]}
      <hr
        className="board-resize-handle"
        tabIndex={0}
        aria-label="タイムラインと詳細の高さ"
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 100)}
        title="ドラッグで高さを調整（上下キーでも調整・ダブルクリックで3:2に戻す）"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { y: event.clientY, ratio };
          setResizing(true);
        }}
        onPointerMove={(event) => {
          if (!drag.current || !container.current) return;
          const height = container.current.clientHeight - 12;
          if (height <= 0) return;
          setRatio(
            clamp(
              drag.current.ratio + (event.clientY - drag.current.y) / height,
            ),
          );
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
          drag.current = null;
          setResizing(false);
        }}
        onLostPointerCapture={() => {
          drag.current = null;
          setResizing(false);
        }}
        onPointerCancel={() => {
          drag.current = null;
          setResizing(false);
        }}
        onDoubleClick={() => setRatio(0.6)}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            setRatio(clamp(ratio + (event.key === "ArrowUp" ? -0.05 : 0.05)));
          } else if (event.key === "Home") {
            event.preventDefault();
            setRatio(0.6);
          }
        }}
      />
      {children[1]}
    </div>
  );
}

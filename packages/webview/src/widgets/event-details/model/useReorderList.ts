import {
  type DragEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type Placement = "before" | "after";
type Move = (
  id: string,
  target: string,
  placement: Placement,
) => boolean | Promise<boolean>;

/** REQ-045: 所属ごとのドラッグ状態を閉じ、選択操作と独立して保存する。 */
export function useReorderList(
  scope: string,
  ids: readonly string[],
  onMove?: Move,
) {
  const active = useRef<{ id: string; scope: string } | null>(null);
  const busy = useRef(false);
  const restoreFocus = useRef<HTMLElement | undefined>(undefined);
  const [moving, setMoving] = useState(false);
  useEffect(() => {
    if (moving) return;
    const element = restoreFocus.current;
    restoreFocus.current = undefined;
    if (element?.isConnected && document.activeElement === document.body)
      element.focus({ preventScroll: true });
  }, [moving]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [target, setTarget] = useState<{
    id: string;
    placement: Placement;
  } | null>(null);
  const clear = useCallback(() => {
    active.current = null;
    setDragging(null);
    setTarget(null);
  }, []);
  useEffect(() => {
    if (active.current?.scope !== scope) clear();
    const cancel = (event: KeyboardEvent) => {
      if (event.key === "Escape") clear();
    };
    window.addEventListener("keydown", cancel);
    window.addEventListener("blur", clear);
    window.addEventListener("drop", clear);
    window.addEventListener("dragend", clear);
    return () => {
      active.current = null;
      window.removeEventListener("keydown", cancel);
      window.removeEventListener("blur", clear);
      window.removeEventListener("drop", clear);
      window.removeEventListener("dragend", clear);
    };
  }, [scope, clear]);
  const move = async (
    id: string,
    to: string,
    placement: Placement,
    focus?: HTMLElement,
  ) => {
    if (
      !onMove ||
      busy.current ||
      id === to ||
      !ids.includes(id) ||
      !ids.includes(to)
    )
      return;
    busy.current = true;
    setMoving(true);
    try {
      await onMove(id, to, placement);
    } finally {
      busy.current = false;
      restoreFocus.current = focus;
      setMoving(false);
    }
  };
  const placement = (event: DragEvent<HTMLElement>): Placement => {
    const rect = event.currentTarget.getBoundingClientRect();
    return event.clientY < rect.top + rect.height / 2 ? "before" : "after";
  };
  const valid = (id: string) =>
    !busy.current &&
    active.current?.scope === scope &&
    active.current.id !== id &&
    ids.includes(active.current.id) &&
    ids.includes(id);
  return {
    moving,
    rowProps: (id: string) => ({
      "data-reorder-id": id,
      "data-dragging": dragging === id || undefined,
      "data-drop": target?.id === id ? target.placement : undefined,
      onDragOver(event: DragEvent<HTMLDivElement>) {
        if (!valid(id)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setTarget({ id, placement: placement(event) });
      },
      onDragLeave(event: DragEvent<HTMLDivElement>) {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setTarget(null);
      },
      onDrop(event: DragEvent<HTMLDivElement>) {
        const from = active.current;
        const accepted = valid(id);
        clear();
        if (!accepted || !from) return;
        event.preventDefault();
        void move(from.id, id, placement(event));
      },
    }),
    handleProps: (id: string, name: string) => ({
      type: "button" as const,
      className: "record-drag-handle",
      "aria-label": `${name}を並べ替え`,
      title: "ドラッグで並べ替え（上下キーでも移動）",
      draggable: !moving,
      disabled: moving,
      onClick(event: React.MouseEvent<HTMLButtonElement>) {
        event.stopPropagation();
      },
      onDragStart(event: DragEvent<HTMLButtonElement>) {
        if (busy.current) {
          event.preventDefault();
          return;
        }
        active.current = { id, scope };
        setDragging(id);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", id);
        const row = event.currentTarget.closest(".record-surface");
        if (row) event.dataTransfer.setDragImage(row, 20, row.clientHeight / 2);
      },
      onDragEnd: clear,
      onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
        if (event.key === "Escape") {
          clear();
          return;
        }
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
        event.preventDefault();
        event.stopPropagation();
        const index = ids.indexOf(id) + (event.key === "ArrowUp" ? -1 : 1);
        const to = ids[index];
        if (to)
          void move(
            id,
            to,
            event.key === "ArrowUp" ? "before" : "after",
            event.currentTarget,
          );
      },
    }),
  };
}

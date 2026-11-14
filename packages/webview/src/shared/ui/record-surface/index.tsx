import type { ReactNode } from "react";
/** 全面の選択ボタンと独立操作を兄弟にし、ボタンの入れ子を作らない。 */
export function RecordSurface({
  name,
  className,
  onSelect,
  children,
}: {
  name: string;
  className: string;
  onSelect(): void;
  children: ReactNode;
}) {
  return (
    <div className={`record-surface ${className}`}>
      <button
        type="button"
        className="record-hitbox"
        aria-label={`${name}を選択`}
        onClick={onSelect}
      />
      {children}
    </div>
  );
}

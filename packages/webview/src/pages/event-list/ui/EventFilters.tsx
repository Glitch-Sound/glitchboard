import { useState } from "react";
import { todayInTokyo } from "../../../../../shared/src/calculation/dates.js";
import type { Project } from "../../../../../shared/src/domain/index.js";
import { groupEvents, type TargetFilter } from "../model/groupEvents.js";

type Entry = { file: string; load: boolean; name: string };
type Props = {
  target: TargetFilter;
  projects: readonly Project[];
  projectEntries?: readonly Entry[];
  onTargetChange(target: TargetFilter): void;
  onProjectChange?: (file: string, load: boolean) => void;
  today?: string;
};

/** REQ-020: 対象とProjectの抽出条件、変更数、表示件数を示す。 */
export function EventFilters({
  target,
  projects,
  projectEntries = [],
  onTargetChange,
  onProjectChange,
  today = todayInTokyo(),
}: Props) {
  const [open, setOpen] = useState(false);
  const groups = groupEvents(projects, today, target);
  const count = Object.values(groups).reduce(
    (sum, rows) => sum + rows.length,
    0,
  );
  const changed =
    Number(target !== "pending") +
    projectEntries.filter((entry) => !entry.load).length;
  return (
    <div className="event-filters">
      <button
        type="button"
        aria-label="抽出条件"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        ▽{changed > 0 && <sup>{changed}</sup>}
      </button>
      <p>
        {target === "pending" ? "未完了 + 今後" : "すべて"}・{count}件
      </p>
      {open && (
        <div className="filter-popover">
          <label>
            対象
            <select
              aria-label="対象"
              value={target}
              onChange={(event) =>
                onTargetChange(event.target.value as TargetFilter)
              }
            >
              <option value="pending">未完了 + 今後</option>
              <option value="all">すべて</option>
            </select>
          </label>
          {projectEntries.map((entry) => (
            <label key={entry.file}>
              <input
                type="checkbox"
                checked={entry.load}
                onChange={(event) =>
                  onProjectChange?.(entry.file, event.target.checked)
                }
              />
              {entry.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

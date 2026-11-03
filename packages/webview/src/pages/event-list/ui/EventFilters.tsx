import { useState } from "react";
import { todayInTokyo } from "../../../../../shared/src/calculation/dates.js";
import type { Project } from "../../../../../shared/src/domain/index.js";
import { groupEvents, type TargetFilter } from "../model/groupEvents.js";

type Entry = { file: string; load: boolean; name: string; color?: string };
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
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
          <path
            d="M2 4h16l-6.5 7v5l-3 2v-7z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
        {changed > 0 && <sup>{changed}</sup>}
      </button>
      <p>
        {target === "pending" ? "未完了 + 今後" : "すべて"}・{count}件
      </p>
      {open && (
        <div className="filter-popover">
          <fieldset className="target-switch">
            <legend>対象</legend>
            <button
              type="button"
              aria-pressed={target === "pending"}
              onClick={() => onTargetChange("pending")}
            >
              未完了 + 今後
            </button>
            <button
              type="button"
              aria-pressed={target === "all"}
              onClick={() => onTargetChange("all")}
            >
              すべて
            </button>
          </fieldset>
          <fieldset className="project-filters">
            <legend>読み込むプロジェクト</legend>
            <div className="project-chips">
              {projectEntries.map((entry) => (
                <label
                  key={entry.file}
                  className={`project-chip ${entry.load ? "selected" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={entry.load}
                    onChange={(event) =>
                      onProjectChange?.(entry.file, event.target.checked)
                    }
                  />
                  <i
                    className="project-dot"
                    style={{
                      backgroundColor:
                        entry.color ??
                        projects.find((project) => project.name === entry.name)
                          ?.color ??
                        "var(--vscode-descriptionForeground)",
                    }}
                  />
                  {entry.name}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      )}
    </div>
  );
}

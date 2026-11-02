import { useState } from "react";
import { pointTone } from "../../../shared/lib/pointTone.js";

type Points = 1 | 2 | 3 | 5 | 8 | 13 | 21;
type Props = {
  points: Points | undefined;
  onChange(points: Points | null): void;
};
const values: Points[] = [1, 2, 3, 5, 8, 13, 21];

/** REQ-023: 7つの許可値からTaskポイントを選ぶ。 */
export function PointSelector({ points, onChange }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <span className="point-selector">
      <button
        type="button"
        className={pointTone(points)}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {points === undefined ? "未見積" : `${points}pt`}
      </button>
      {open && (
        <span className="point-options">
          {values.map((value) => (
            <button
              key={value}
              className={pointTone(value)}
              type="button"
              onClick={() => {
                onChange(value);
                setOpen(false);
              }}
            >
              {value}pt
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
          >
            未見積
          </button>
        </span>
      )}
    </span>
  );
}

type Props = {
  days: readonly string[];
  requiredByDay: Readonly<Record<string, number>>;
  completedByDay: Readonly<Record<string, number>>;
  pace: number | null;
  learning: boolean;
  periodLoad: number | null;
  dangerCount: number;
};

/** REQ-017: 必要ペースと実績、負荷、危険件数を一つのヘッダーに示す。 */
export function WorkloadHeader({
  days,
  requiredByDay,
  completedByDay,
  pace,
  learning,
  periodLoad,
  dangerCount,
}: Props) {
  const values = days.map((day) => requiredByDay[day] ?? 0);
  const max = Math.max(1, ...values, pace ?? 0);
  const width = Math.max(1, days.length) * 40;
  const y = (value: number) => 64 - (value / max) * 56;
  const step = values
    .map(
      (value, index) =>
        `${index === 0 ? "M" : "L"}${index * 40},${y(value)} H${(index + 1) * 40}`,
    )
    .join(" ");
  const maxIndex = values.indexOf(Math.max(...values));
  const showPace = !learning && pace !== null && pace > 0;
  return (
    <header className="workload-header">
      <div className="workload-summary">
        <span>
          実績ペース:{" "}
          <strong>
            {learning
              ? "学習中"
              : pace === null
                ? "—"
                : `${pace.toFixed(1)}pt/日`}
          </strong>
        </span>
        {!learning && periodLoad !== null && (
          <span className={periodLoad > 100 ? "danger-text" : ""}>
            期間負荷: {Math.round(periodLoad)}%
          </span>
        )}
        <span>危険: {dangerCount}件</span>
      </div>
      <div
        className="completion-bars"
        role="img"
        aria-label="直近10稼働日の完了ポイント"
      >
        {Object.entries(completedByDay).map(([day, points]) => (
          <div
            key={day}
            title={`${day}: ${points}pt`}
            style={{ height: `${Math.max(2, points * 8)}px` }}
          />
        ))}
      </div>
      <svg
        viewBox={`0 0 ${width} 72`}
        role="img"
        aria-label="日別必要ペース"
        preserveAspectRatio="none"
      >
        {values.map(
          (value, index) =>
            showPace &&
            value > pace && (
              <rect
                key={days[index]}
                className="overload-area"
                x={index * 40}
                y={y(value)}
                width="40"
                height={y(pace) - y(value)}
              />
            ),
        )}
        <path className="required-step" d={step} fill="none" />
        {showPace && (
          <line
            className="pace-line"
            x1="0"
            x2={width}
            y1={y(pace)}
            y2={y(pace)}
          />
        )}
        {maxIndex >= 0 && values[maxIndex] > 0 && (
          <text
            x={maxIndex * 40 + 20}
            y={Math.max(7, y(values[maxIndex]) - 2)}
            textAnchor="middle"
          >
            {values[maxIndex]?.toFixed(1)}
          </text>
        )}
      </svg>
      <div className="workload-days">
        {days.map((day, index) => (
          <span
            key={day}
            data-date={day}
            className={showPace && values[index] > pace ? "overlap-day" : ""}
          >
            {day.slice(5)}
          </span>
        ))}
      </div>
    </header>
  );
}

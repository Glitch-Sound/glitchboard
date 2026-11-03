type Props = {
  completedByDay: Readonly<Record<string, number>>;
  pace: number | null;
  learning: boolean;
  periodLoad: number | null;
  dangerCount: number;
};

/** REQ-017: ヘッダーに実績、期間負荷、危険件数をまとめる。 */
export function WorkloadHeader({
  completedByDay,
  pace,
  learning,
  periodLoad,
  dangerCount,
}: Props) {
  const entries = Object.entries(completedByDay);
  const max = Math.max(1, ...entries.map(([, points]) => points));
  return (
    <div className="workload-summary">
      <div className="workload-metric actual-metric">
        <small>実績ペース（直近10稼働日）</small>
        <div className="actual-value">
          <strong>
            {learning
              ? "学習中"
              : pace === null
                ? "—"
                : `${pace.toFixed(1)}pt/日`}
          </strong>
          <div
            className="completion-bars"
            role="img"
            aria-label="直近10稼働日の完了ポイント"
          >
            {entries.map(([day, points]) =>
              points === 0 ? (
                <i
                  key={day}
                  className="completion-zero"
                  title={`${day}: 0pt`}
                />
              ) : (
                <i
                  key={day}
                  className="completion-bar"
                  title={`${day}: ${points}pt`}
                  style={{ height: `${Math.max(3, (points / max) * 30)}px` }}
                />
              ),
            )}
          </div>
        </div>
      </div>
      <div
        className={`workload-metric ${periodLoad !== null && periodLoad > 100 ? "danger-text" : ""}`}
      >
        <small>期間負荷</small>
        <strong>
          {learning || periodLoad === null ? "—" : `${Math.round(periodLoad)}%`}
        </strong>
      </div>
      <div
        className={`workload-metric ${dangerCount > 0 ? "danger-text" : ""}`}
      >
        <small>危険件数</small>
        <strong>{dangerCount}</strong>
      </div>
    </div>
  );
}

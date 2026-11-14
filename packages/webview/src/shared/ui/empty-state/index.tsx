export function EmptyState({
  kind,
}: {
  kind: "project" | "load" | "event" | "filter";
}) {
  const copy = {
    project: [
      "Project を追加して始めましょう",
      "メインパネルの Project ＋ から名前と色を設定します。",
    ],
    load: [
      "Project の読み込みを選びましょう",
      "左の抽出条件から Project を読み込んでください。",
    ],
    event: [
      "Event を追加しましょう",
      "左の EVENT 一覧の ＋ から名前と期限を設定します。そのまま Task を追加できます。",
    ],
    filter: [
      "表示できる Event がありません",
      "Event ＋ で追加するか、抽出条件を確認してください。",
    ],
  }[kind];
  return (
    <div className="board-empty">
      <h2>{copy[0]}</h2>
      <p>{copy[1]}</p>
    </div>
  );
}

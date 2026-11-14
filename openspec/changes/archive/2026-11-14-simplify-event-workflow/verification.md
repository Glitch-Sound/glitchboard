# 検証報告

2026-11-14 に simplify-event-workflow の提案、差分仕様、設計、全11タスク、実装と検証証跡を照合した。

## 判定

| 観点 | 結果 |
| --- | --- |
| 完全性 | 11/11タスク、追加5要件と変更2要件を確認した |
| 正確性 | 7/7要件と24/24シナリオに実装と自動テストがある |
| 一貫性 | D-01〜D-04、保存境界、FSD とテーマ変数の利用に一致する |

CRITICAL、WARNING、SUGGESTION は0件である。\
利用者が行う最終の VS Code 実機確認は、本検証の対象外として manual-checks.md に9項目を未確認で記録した。\
これは依頼に従った役割分担であり、運用開始を承認したものではない。

## 実装とテストの対応

| 要件 | 実装 | 自動検証 |
| --- | --- | --- |
| REQ-033 | 共有スキーマ、storage/hierarchy.ts、session.ts、EventDetails.tsx | event-tasks.test.ts、event-workflow.test.tsx |
| REQ-034 | EventDetails.tsx の選択と操作世代 | event-workflow.test.tsx |
| REQ-035 | Timeline、EventDetails、DeleteControl と BoardApp | board-workflow.test.tsx、実ブラウザー |
| REQ-036 | DetailPanel、DeleteDialog、BoardApp の保存応答 | edit-workflow.test.tsx、既存日付テスト、実ブラウザー |
| REQ-037 | 共通 InlineAdd、BoardApp、session.ts | board-workflow.test.tsx、event-tasks.test.ts、実ブラウザー |
| REQ-018 | EventDetails と既存初期 Event 選択 | req-018-s01〜s03、req-013-s04-default-selection |
| REQ-031 | BoardSplit の ResizeObserver と共通下限 | board-split-resize.test.tsx、既存 layout 検証と実ブラウザー |

scenario ID と検証方法は design.md の24行とトレース検査で一致した。\
通常 Story の名前一致による誤転用、重複グループ、重複送信、遅い応答、取消後の再開、存在しない追加先を含めて照合した。\
既存データは等値比較、保存失敗はファイル全体の不変更で検証し、一般的な文字列が含まれるだけで成功としない。\
元の EventDetails へ一時的に戻すと画面状態の5テストが全件失敗することも確認した。

## 実行結果

- 全88ファイル、172テスト成功。
- Biome、型検査、FSD 検査、ビルド成功。
- 全7 capability の正式仕様の厳格検査成功。
- 変更の厳格検査と変更単位の厳格トレース検査成功。
- 初回追加分すべてに対する git diff --cached --check 成功。
- 今回の実保存 UI 検証は両テーマ成功。
- カレンダーは2時間帯、2テーマ、3表示面の12組合せ成功。
- 初期設定は2テーマ、2表示面、2状態の8組合せ成功。
- 既存 layout の高さ、並べ替え、スクロール、3期間、最小高さの両テーマ検証成功。

証跡は artifacts/replacement/ に保存した。\
純粋計算と既存操作のテストを残し、変更した期待値は新しい仕様の空 Event 案内と段階的 Esc に限る。\
ビルドの Zod の PURE 注釈警告は元版でも発生し、出力の生成と検証は成功した。

## 設計との一致

- D-01: 専用グループは任意属性で識別し、最初の Task と同じ書込で保存する。
- D-02: セッションは保存要求を順次処理し、同一 Event 更新では入力を維持する。
- D-03: 名前の詳細導線と Story 選択を分離し、追加フォームと取消を共通化した。
- D-04: 操作時とコンテナ縮小時に同じ下限を適用する。

実装を省略して通した検査、無効化した検査、未完了の実装タスクはない。

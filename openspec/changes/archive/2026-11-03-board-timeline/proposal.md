# Proposal

## Why

Project横断の期限、負荷、進捗を一画面で把握できるようにする。

## What Changes

- ボードとタイムラインを追加する。
- この変更に含む振る舞いは差分仕様の受け入れ例で確認する。

## Scope

**In scope:**

- ボードとタイムラインの要件、表示または保存、検証。\
**Out of scope:**

- 他の変更の機能。\
  依存する場合は各変更の仕様に従う。
- 表示更新性能の受け入れ判定。\
  利用者の指定によりこの変更から除外する。

## Requirements

| 要件ID | 要件名 | 操作 | 根拠となる方針文書の節 | 台帳 |
| --- | --- | --- | --- | --- |
| REQ-015 | 表示期間 | 追加 | [product.md#画面と操作](../../../product.md#画面と操作) | [台帳](../../../traceability.md) |
| REQ-016 | Project別の期限タイムライン | 追加 | [product.md#画面と操作](../../../product.md#画面と操作) | [台帳](../../../traceability.md) |
| REQ-017 | ヘッダーと必要ペースグラフ | 追加 | [product.md#画面と操作](../../../product.md#画面と操作) | [台帳](../../../traceability.md) |
| REQ-018 | Event詳細エリア | 追加 | [product.md#画面と操作](../../../product.md#画面と操作) | [台帳](../../../traceability.md) |
| NREQ-003 | テーマ追従 | 追加 | [product.md#画面と操作](../../../product.md#画面と操作) | [台帳](../../../traceability.md) |

## Capabilities

### New Capabilities

- `board-visualization`: ボードとタイムラインを扱う。\
  対象はREQ-015、REQ-016、REQ-017、REQ-018、NREQ-003。

### Modified Capabilities

- なし

## Examples

| 要件ID | 観点 | 状態と入力 | 契機 | 観測する結果 |
| --- | --- | --- | --- | --- |
| REQ-015 | 正常 | 2026-11-03を今日とする | 月を選ぶ | [REQ-015-S01](specs/board-visualization/spec.md#scenario-req-015-s01-月末) |
| REQ-016 | 正常 | 同じProjectの同じ日に3件のEventがある | まとめた◆を選ぶ | [REQ-016-S01](specs/board-visualization/spec.md#scenario-req-016-s01-同日の複数Event) |
| REQ-016 | 境界 | 月表示で3件のEventがあり1件が選択中である | タイムラインを描く | [REQ-016-S02](specs/board-visualization/spec.md#scenario-req-016-s02-月表示) |
| REQ-017 | 正常 | 最初の完了から5稼働日目である | ボードを開く | [REQ-017-S01](specs/board-visualization/spec.md#scenario-req-017-s01-学習中の表示) |
| REQ-017 | 境界 | 実績ペース2pt/日で必要ペースが3ptの日がある | グラフを描く | [REQ-017-S02](specs/board-visualization/spec.md#scenario-req-017-s02-負荷の超過) |
| REQ-018 | 正常 | 最初のStoryは完了済み、次のStoryに未完了Taskがある | Eventを選ぶ | [REQ-018-S01](specs/board-visualization/spec.md#scenario-req-018-s01-未完了Taskを選ぶ) |
| REQ-018 | 境界 | Eventの全Taskが完了している | Eventを選ぶ | [REQ-018-S02](specs/board-visualization/spec.md#scenario-req-018-s02-未完了Taskがない) |
| NREQ-003 | 正常 | VS Codeのライトテーマを使用している | ボードを開く | [NREQ-003-S01](specs/board-visualization/spec.md#scenario-nreq-003-s01-ライトテーマ) |

## Impact

- 実装と配置: packages/webview/src/pages/board と widgets。
- 互換性とデータ: 新規機能のため既存データの移行はない。\
  保存形式と日付境界は仕様で定義する。
- 依存関係と文書: [技術方針](../../../tech.md)と[構造方針](../../../structure.md)に従い、正式仕様化時にspecs/README.mdを更新する。

## Open Questions

- なし。\
  境界条件は差分仕様の具体案として記載した。

## Readiness

- 計画の状態: 合意済み。
- 合意の根拠: 2026-11-03に利用者がdata-persistenceから依存順に全7件を適用すると指定した。
- 対象除外の根拠: 利用者が`board-timeline`の表示更新性能に関する内容を除外してよいと指定した。
- 実装を妨げる未決事項: なし。

# Proposal

## Why

期限と対象Projectをサイドバーで絞り込み、Eventへすぐ移動できるようにする。

## What Changes

- EVENT一覧と抽出を追加する。
- この変更に含む振る舞いは差分仕様の受け入れ例で確認する。

## Scope

**In scope:**

- EVENT一覧と抽出の要件、表示または保存、検証。

**Out of scope:**

- 他の変更の機能。依存する場合は各変更の仕様に従う。

## Requirements

| 要件ID | 要件名 | 操作 | 根拠となる方針文書の節 | 台帳 |
| --- | --- | --- | --- | --- |
| REQ-019 | 期限順とグループ | 追加 | [product.md#画面と操作](../../../product.md#画面と操作) | [台帳](../../../traceability.md) |
| REQ-020 | 抽出条件とProject切り替え | 追加 | [product.md#画面と操作](../../../product.md#画面と操作) | [台帳](../../../traceability.md) |
| REQ-021 | Eventへの移動 | 追加 | [product.md#画面と操作](../../../product.md#画面と操作) | [台帳](../../../traceability.md) |

## Capabilities

### New Capabilities

- `event-navigation`: EVENT一覧と抽出を扱う。対象はREQ-019、REQ-020、REQ-021。

### Modified Capabilities

- なし

## Examples

| 要件ID | 観点 | 状態と入力 | 契機 | 観測する結果 |
| --- | --- | --- | --- | --- |
| REQ-019 | 正常 | 今日が火曜で日曜期限と翌月曜期限のEventがある | 一覧を開く | [REQ-019-S01](specs/event-navigation/spec.md#scenario-req-019-s01-日曜の境界) |
| REQ-019 | 境界 | 完了済みEventが1件ある | 対象をすべてへ変える | [REQ-019-S02](specs/event-navigation/spec.md#scenario-req-019-s02-完了済み) |
| REQ-020 | 正常 | 期限切れ未完了Eventが1件ある | 対象を未完了 + 今後にする | [REQ-020-S01](specs/event-navigation/spec.md#scenario-req-020-s01-期限切れの包含) |
| REQ-020 | 境界 | Project AとBが読込中である | Bを外す | [REQ-020-S02](specs/event-navigation/spec.md#scenario-req-020-s02-読込切り替え) |
| REQ-021 | 正常 | ボードが閉じており一覧にEventがある | そのEvent行を選ぶ | [REQ-021-S01](specs/event-navigation/spec.md#scenario-req-021-s01-サイドバーから移動) |

## Impact

- 実装と配置: packages/webview/src/pages/event-list。
- 互換性とデータ: 新規機能のため既存データの移行はない。保存形式と日付境界は仕様で定義する。
- 依存関係と文書: [技術方針](../../../tech.md)と[構造方針](../../../structure.md)に従い、正式仕様化時にspecs/README.mdを更新する。

## Open Questions

- なし。境界条件は差分仕様の具体案として記載した。

## Readiness

- 計画の状態: 合意済み。
- 合意の根拠: 2026-11-03に利用者がdata-persistenceから依存順に全7件を適用すると指定した。
- 実装を妨げる未決事項: なし。

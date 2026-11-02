# Proposal

## Why

管理項目を少ない操作で追加・更新・削除し、計算結果へ即時反映する。

## What Changes

- 階層の追加・変更・削除を追加する。
- この変更に含む振る舞いは差分仕様の受け入れ例で確認する。

## Scope

**In scope:**

- 階層の追加・変更・削除の要件、表示または保存、検証。

**Out of scope:**

- 他の変更の機能。依存する場合は各変更の仕様に従う。

## Requirements

| 要件ID | 要件名 | 操作 | 根拠となる方針文書の節 | 台帳 |
| --- | --- | --- | --- | --- |
| REQ-022 | インライン追加 | 追加 | [product.md#画面と操作](../../../product.md#画面と操作) | [台帳](../../../traceability.md) |
| REQ-023 | ポイント変更 | 追加 | [product.md#画面と操作](../../../product.md#画面と操作) | [台帳](../../../traceability.md) |
| REQ-024 | 完了の切り替え | 追加 | [product.md#画面と操作](../../../product.md#画面と操作) | [台帳](../../../traceability.md) |
| REQ-025 | 確認付き物理削除 | 追加 | [product.md#画面と操作](../../../product.md#画面と操作) | [台帳](../../../traceability.md) |

## Capabilities

### New Capabilities

- `hierarchy-editing`: 階層の追加・変更・削除を扱う。対象はREQ-022、REQ-023、REQ-024、REQ-025。

### Modified Capabilities

- なし

## Examples

| 要件ID | 観点 | 状態と入力 | 契機 | 観測する結果 |
| --- | --- | --- | --- | --- |
| REQ-022 | 正常 | Event見出しで選択中Projectがある | 名前と期限を入力してEnterを押す | [REQ-022-S01](specs/hierarchy-editing/spec.md#scenario-req-022-s01-Event追加) |
| REQ-022 | 境界 | Storyの入力欄が開いている | Escを押す | [REQ-022-S02](specs/hierarchy-editing/spec.md#scenario-req-022-s02-取消) |
| REQ-023 | 正常 | 未見積Taskがある | ポイントバッジから8を選ぶ | [REQ-023-S01](specs/hierarchy-editing/spec.md#scenario-req-023-s01-未見積を設定) |
| REQ-024 | 正常 | 2026-11-03に未完了Taskがある | Taskをチェックする | [REQ-024-S01](specs/hierarchy-editing/spec.md#scenario-req-024-s01-完了と解除) |
| REQ-024 | 境界 | 完了済みTaskがある | チェックを外す | [REQ-024-S02](specs/hierarchy-editing/spec.md#scenario-req-024-s02-完了解除) |
| REQ-025 | 正常 | StoryにTaskが12件ある | 右クリックから削除を選ぶ | [REQ-025-S01](specs/hierarchy-editing/spec.md#scenario-req-025-s01-子孫の確認) |
| REQ-025 | 境界 | 削除確認が表示されている | 取消を選ぶ | [REQ-025-S02](specs/hierarchy-editing/spec.md#scenario-req-025-s02-取消) |

## Impact

- 実装と配置: packages/webview/src/features と packages/extension/src/storage。
- 互換性とデータ: 新規機能のため既存データの移行はない。保存形式と日付境界は仕様で定義する。
- 依存関係と文書: [技術方針](../../../tech.md)と[構造方針](../../../structure.md)に従い、正式仕様化時にspecs/README.mdを更新する。

## Open Questions

- なし。境界条件は差分仕様の具体案として記載した。

## Readiness

- 計画の状態: 合意済み。
- 合意の根拠: 2026-11-03に利用者がdata-persistenceから依存順に全7件を適用すると指定した。
- 実装を妨げる未決事項: なし。

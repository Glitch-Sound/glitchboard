# Proposal

## Why

期限と実績を基に、稼働日単位で予測・必要ペース・危険を一貫して計算できるようにする。

## What Changes

- 稼働日・負荷・危険判定を追加する。
- この変更に含む振る舞いは差分仕様の受け入れ例で確認する。

## Scope

**In scope:**

- 稼働日・負荷・危険判定の要件、表示または保存、検証。\
**Out of scope:**

- 他の変更の機能。\
  依存する場合は各変更の仕様に従う。

## Requirements

| 要件ID | 要件名 | 操作 | 根拠となる方針文書の節 | 台帳 |
| --- | --- | --- | --- | --- |
| REQ-006 | 稼働日と日付基準 | 追加 | [product.md#負荷と危険の基本原則](../../../product.md#負荷と危険の基本原則) | [台帳](../../../traceability.md) |
| REQ-007 | 実績ペースと学習中 | 追加 | [product.md#負荷と危険の基本原則](../../../product.md#負荷と危険の基本原則) | [台帳](../../../traceability.md) |
| REQ-008 | 完了予測 | 追加 | [product.md#負荷と危険の基本原則](../../../product.md#負荷と危険の基本原則) | [台帳](../../../traceability.md) |
| REQ-009 | 必要ペース | 追加 | [product.md#負荷と危険の基本原則](../../../product.md#負荷と危険の基本原則) | [台帳](../../../traceability.md) |
| REQ-010 | 期間負荷 | 追加 | [product.md#負荷と危険の基本原則](../../../product.md#負荷と危険の基本原則) | [台帳](../../../traceability.md) |
| REQ-011 | 危険と件数 | 追加 | [product.md#負荷と危険の基本原則](../../../product.md#負荷と危険の基本原則) | [台帳](../../../traceability.md) |

## Capabilities

### New Capabilities

- `workload-analysis`: 稼働日・負荷・危険判定を扱う。\
  対象はREQ-006、REQ-007、REQ-008、REQ-009、REQ-010、REQ-011。

### Modified Capabilities

- なし

## Examples

| 要件ID | 観点 | 状態と入力 | 契機 | 観測する結果 |
| --- | --- | --- | --- | --- |
| REQ-006 | 正常 | 土日と日本の祝日を休日とする設定である | 2026-11-03を判定する | [REQ-006-S01](specs/workload-analysis/spec.md#scenario-req-006-s01-休日設定) |
| REQ-006 | 境界 | public_holidaysがfalseで火曜日は休日設定にない | 2026-11-03を判定する | [REQ-006-S02](specs/workload-analysis/spec.md#scenario-req-006-s02-祝日を稼働日とする) |
| REQ-007 | 正常 | 直近10稼働日に3ptと未見積のTaskが各1件完了した | 実績を計算する | [REQ-007-S01](specs/workload-analysis/spec.md#scenario-req-007-s01-未見積の完了) |
| REQ-007 | 境界 | 最初の完了日から9稼働日目である | 実績を計算する | [REQ-007-S02](specs/workload-analysis/spec.md#scenario-req-007-s02-学習中の境界) |
| REQ-007 | 境界 | 10稼働日を経過し直近10稼働日に完了Taskがない | 実績を計算する | [REQ-007-S03](specs/workload-analysis/spec.md#scenario-req-007-s03-0ptの実績) |
| REQ-008 | 正常 | 期限順に2つのEventがあり実績ペースが2pt/日、各残りが2ptである | 予測を計算する | [REQ-008-S01](specs/workload-analysis/spec.md#scenario-req-008-s01-複数Projectの競合) |
| REQ-008 | 境界 | 学習中または実績ペース0pt/日で未完了Eventがある | 予測を計算する | [REQ-008-S02](specs/workload-analysis/spec.md#scenario-req-008-s02-算出不能) |
| REQ-009 | 正常 | 今日が稼働日で、期限が休日のEventの残りが4pt、期限までに2稼働日ある | 必要ペースを計算する | [REQ-009-S01](specs/workload-analysis/spec.md#scenario-req-009-s01-期限が休日) |
| REQ-009 | 境界 | 今日が休日で期限切れEventの残りが5ptである | 必要ペースを計算する | [REQ-009-S02](specs/workload-analysis/spec.md#scenario-req-009-s02-期限切れ) |
| REQ-010 | 正常 | 必要ペース合計が12ptで稼働日数4、実績ペース2pt/日である | 期間負荷を計算する | [REQ-010-S01](specs/workload-analysis/spec.md#scenario-req-010-s01-100%超) |
| REQ-010 | 境界 | 学習中または期間内稼働日が0である | 期間負荷を計算する | [REQ-010-S02](specs/workload-analysis/spec.md#scenario-req-010-s02-分母0) |
| REQ-011 | 正常 | 同じEventが期限まで2日で予測日が期限後である | 危険件数を計算する | [REQ-011-S01](specs/workload-analysis/spec.md#scenario-req-011-s01-期限接近と溢れ) |
| REQ-011 | 境界 | 期限まで5暦日で他の危険がない | 危険を判定する | [REQ-011-S02](specs/workload-analysis/spec.md#scenario-req-011-s02-注意のみ) |
| REQ-011 | 境界 | 最初の完了から3稼働日目に期限切れEventがある | 危険を判定する | [REQ-011-S03](specs/workload-analysis/spec.md#scenario-req-011-s03-学習中) |

## Impact

- 実装と配置: packages/shared/src/calculation。
- 互換性とデータ: 新規機能のため既存データの移行はない。\
  保存形式と日付境界は仕様で定義する。
- 依存関係と文書: [技術方針](../../../tech.md)と[構造方針](../../../structure.md)に従い、正式仕様化時にspecs/README.mdを更新する。

## Open Questions

- なし。\
  境界条件は差分仕様の具体案として記載した。

## Readiness

- 計画の状態: 合意済み。
- 合意の根拠: 2026-11-03に利用者がdata-persistenceから依存順に全7件を適用すると指定した。
- 実装を妨げる未決事項: なし。

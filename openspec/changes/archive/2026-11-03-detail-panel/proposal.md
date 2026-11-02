# Proposal

## Why

全階層の補足と編集操作を共通の詳細パネルから行えるようにする。

## What Changes

- 共通詳細パネルを追加する。
- この変更に含む振る舞いは差分仕様の受け入れ例で確認する。

## Scope

**In scope:**

- 共通詳細パネルの要件、表示または保存、検証。

**Out of scope:**

- 他の変更の機能。依存する場合は各変更の仕様に従う。

## Requirements

| 要件ID | 要件名 | 操作 | 根拠となる方針文書の節 | 台帳 |
| --- | --- | --- | --- | --- |
| REQ-026 | 詳細パネルの表示 | 追加 | [product.md#画面と操作](../../../product.md#画面と操作) | [台帳](../../../traceability.md) |
| REQ-027 | 詳細編集 | 追加 | [product.md#画面と操作](../../../product.md#画面と操作) | [台帳](../../../traceability.md) |
| REQ-028 | 補足とリンク | 追加 | [product.md#画面と操作](../../../product.md#画面と操作) | [台帳](../../../traceability.md) |

## Capabilities

### New Capabilities

- `item-details`: 共通詳細パネルを扱う。対象はREQ-026、REQ-027、REQ-028。

### Modified Capabilities

- なし

## Examples

| 要件ID | 観点 | 状態と入力 | 契機 | 観測する結果 |
| --- | --- | --- | --- | --- |
| REQ-026 | 正常 | noteを持つStoryがある | 青い詳細ボタンを押す | [REQ-026-S01](specs/item-details/spec.md#scenario-req-026-s01-補足あり) |
| REQ-026 | 境界 | noteがないTaskがある | 灰色の詳細ボタンを押す | [REQ-026-S02](specs/item-details/spec.md#scenario-req-026-s02-補足なし) |
| REQ-027 | 正常 | Eventの期限が2026-11-10である | パネルで2026-11-12へ変更する | [REQ-027-S01](specs/item-details/spec.md#scenario-req-027-s01-期限変更) |
| REQ-027 | 境界 | 青いProjectがある | パネルで緑を選ぶ | [REQ-027-S02](specs/item-details/spec.md#scenario-req-027-s02-Project色変更) |
| REQ-028 | 正常 | noteとlinksにprojects/guide.mdがある | リンクを押す | [REQ-028-S01](specs/item-details/spec.md#scenario-req-028-s01-相対リンク) |
| REQ-028 | 境界 | linksにjavascript: URLがある | パネルを開く | [REQ-028-S02](specs/item-details/spec.md#scenario-req-028-s02-危険なリンク) |

## Impact

- 実装と配置: packages/webview/src/widgets/detail-panel。
- 互換性とデータ: 新規機能のため既存データの移行はない。保存形式と日付境界は仕様で定義する。
- 依存関係と文書: [技術方針](../../../tech.md)と[構造方針](../../../structure.md)に従い、正式仕様化時にspecs/README.mdを更新する。

## Open Questions

- なし。境界条件は差分仕様の具体案として記載した。

## Readiness

- 計画の状態: 合意済み。
- 合意の根拠: 2026-11-03に利用者がdata-persistenceから依存順に全7件を適用すると指定した。
- 実装を妨げる未決事項: なし。

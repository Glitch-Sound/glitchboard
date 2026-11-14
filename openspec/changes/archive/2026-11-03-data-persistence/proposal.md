# Proposal

## Why

管理専用リポジトリのYAMLを安全に読み書きし、4階層のデータを再利用できるようにする。

## What Changes

- データモデルと永続化を追加する。
- この変更に含む振る舞いは差分仕様の受け入れ例で確認する。

## Scope

**In scope:**

- データモデルと永続化の要件、表示または保存、検証。\
**Out of scope:**

- 他の変更の機能。\
  依存する場合は各変更の仕様に従う。

## Requirements

| 要件ID | 要件名 | 操作 | 根拠となる方針文書の節 | 台帳 |
| --- | --- | --- | --- | --- |
| REQ-001 | 4階層の管理 | 追加 | [product.md#管理モデル](../../../product.md#管理モデル) | [台帳](../../../traceability.md) |
| REQ-002 | 管理ファイルの配置 | 追加 | [product.md#管理モデル](../../../product.md#管理モデル) | [台帳](../../../traceability.md) |
| REQ-003 | 読込対象の切り替え | 追加 | [product.md#管理モデル](../../../product.md#管理モデル) | [台帳](../../../traceability.md) |
| REQ-004 | YAML検証と保全 | 追加 | [product.md#管理モデル](../../../product.md#管理モデル) | [台帳](../../../traceability.md) |
| REQ-005 | 識別子とファイル名 | 追加 | [product.md#管理モデル](../../../product.md#管理モデル) | [台帳](../../../traceability.md) |

## Capabilities

### New Capabilities

- `data-management`: データモデルと永続化を扱う。\
  対象はREQ-001、REQ-002、REQ-003、REQ-004、REQ-005。

### Modified Capabilities

- なし

## Examples

| 要件ID | 観点 | 状態と入力 | 契機 | 観測する結果 |
| --- | --- | --- | --- | --- |
| REQ-001 | 正常 | ProjectにEvent、Story、Taskが各1件ある | Projectを読み込む | [REQ-001-S01](specs/data-management/spec.md#scenario-req-001-s01-階層を読み込む) |
| REQ-001 | 境界 | TaskのpointsとdoneAtが省略されている | Taskを読み込む | [REQ-001-S02](specs/data-management/spec.md#scenario-req-001-s02-未見積と未完了) |
| REQ-002 | 正常 | 設定先にmanage.yamlとprojects/0001_alpha.yamlがある | 別フォルダで拡張を開く | [REQ-002-S01](specs/data-management/spec.md#scenario-req-002-s01-別のワークスペースから開く) |
| REQ-002 | 境界 | 既存番号が0001と0003である | Projectを追加する | [REQ-002-S02](specs/data-management/spec.md#scenario-req-002-s02-新規Projectファイル) |
| REQ-003 | 正常 | 2件のProjectが読み込まれている | 片方のloadをfalseにする | [REQ-003-S01](specs/data-management/spec.md#scenario-req-003-s01-読込を外す) |
| REQ-004 | 正常 | Eventのdueが存在しない日付である | ファイルを読み込む | [REQ-004-S01](specs/data-management/spec.md#scenario-req-004-s01-無効な日付) |
| REQ-004 | 境界 | 変更対象外のTaskにコメントがある | 別Taskを編集して保存する | [REQ-004-S02](specs/data-management/spec.md#scenario-req-004-s02-コメント保持) |
| REQ-005 | 正常 | Project名が「A/B 計画」である | Projectを追加する | [REQ-005-S01](specs/data-management/spec.md#scenario-req-005-s01-名前の安全な変換) |
| REQ-005 | 境界 | 0001_alpha.yamlのProject名がalphaである | 名前をbetaに変更する | [REQ-005-S02](specs/data-management/spec.md#scenario-req-005-s02-名称変更) |

## Impact

- 実装と配置: packages/shared/src/domain と packages/extension/src/storage。
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

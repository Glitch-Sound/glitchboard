# Proposal

## Why

どのワークスペースでも同じ管理データへ接続し、サイドバーとエディタで操作できる土台を作る。

## What Changes

- VS Code拡張の表示基盤を追加する。
- この変更に含む振る舞いは差分仕様の受け入れ例で確認する。

## Scope

**In scope:**

- VS Code拡張の表示基盤の要件、表示または保存、検証。

**Out of scope:**

- 他の変更の機能。依存する場合は各変更の仕様に従う。

## Requirements

| 要件ID | 要件名 | 操作 | 根拠となる方針文書の節 | 台帳 |
| --- | --- | --- | --- | --- |
| REQ-012 | 二つの表示面 | 追加 | [product.md#画面と操作](../../../product.md#画面と操作) | [台帳](../../../traceability.md) |
| REQ-013 | 状態同期と外部変更 | 追加 | [product.md#画面と操作](../../../product.md#画面と操作) | [台帳](../../../traceability.md) |
| REQ-014 | 検証済みメッセージ | 追加 | [product.md#画面と操作](../../../product.md#画面と操作) | [台帳](../../../traceability.md) |
| NREQ-001 | オフライン動作 | 追加 | [product.md#画面と操作](../../../product.md#画面と操作) | [台帳](../../../traceability.md) |

## Capabilities

### New Capabilities

- `vscode-integration`: VS Code拡張の表示基盤を扱う。対象はREQ-012、REQ-013、REQ-014、NREQ-001。

### Modified Capabilities

- なし

## Examples

| 要件ID | 観点 | 状態と入力 | 契機 | 観測する結果 |
| --- | --- | --- | --- | --- |
| REQ-012 | 正常 | VS Code安定版で拡張が有効である | GlitchBoardを開くコマンドを実行する | [REQ-012-S01](specs/vscode-integration/spec.md#scenario-req-012-s01-表示面を開く) |
| REQ-013 | 正常 | 選択中EventのYAMLをエディタ外で削除した | ファイル監視が変更を検知する | [REQ-013-S01](specs/vscode-integration/spec.md#scenario-req-013-s01-外部変更) |
| REQ-013 | 境界 | 外部編集後のYAMLが不正である | 変更を検知する | [REQ-013-S02](specs/vscode-integration/spec.md#scenario-req-013-s02-不正な外部変更) |
| REQ-014 | 正常 | Webviewからpoints:4の更新要求が届く | Extensionがメッセージを受ける | [REQ-014-S01](specs/vscode-integration/spec.md#scenario-req-014-s01-不正なポイント) |
| NREQ-001 | 正常 | ネットワークを無効にし有効な管理データがある | ボードを開きTaskを編集する | [NREQ-001-S01](specs/vscode-integration/spec.md#scenario-nreq-001-s01-ネットワーク遮断) |

## Impact

- 実装と配置: packages/extension と packages/webview。
- 互換性とデータ: 新規機能のため既存データの移行はない。保存形式と日付境界は仕様で定義する。
- 依存関係と文書: [技術方針](../../../tech.md)と[構造方針](../../../structure.md)に従い、正式仕様化時にspecs/README.mdを更新する。

## Open Questions

- なし。境界条件は差分仕様の具体案として記載した。

## Readiness

- 計画の状態: 合意済み。
- 合意の根拠: 2026-11-03に利用者がdata-persistenceから依存順に全7件を適用すると指定した。
- 実装を妨げる未決事項: なし。

# Tasks

## 1. インライン追加

設計: [D-01](design.md#d-01---責務とデータ境界)、[D-02](design.md#d-02---表示更新と検証)、[D-03](design.md#d-03---項目操作のコマンド化)。

- [x] 1.1 [REQ-022/REQ-022-S01、REQ-022-S02] `tests/hierarchy-operations/`に受け入れテストを追加し、`pnpm test`で未実装による失敗を確認する。
- [x] 1.2 [REQ-022/REQ-022-S01、REQ-022-S02] `packages/webview/src/features と packages/extension/src/storage`を実装し、`pnpm test`で該当シナリオが成功することを確認する。
- [x] 1.3 [REQ-022/REQ-022-S01、REQ-022-S02] テスト名と公開責務にIDを記載し、[台帳](../../../traceability.md)へ実装、テスト、検証結果の実在パスを記録する。

## 2. ポイント変更

設計: [D-01](design.md#d-01---責務とデータ境界)、[D-02](design.md#d-02---表示更新と検証)、[D-03](design.md#d-03---項目操作のコマンド化)。

- [x] 2.1 [REQ-023/REQ-023-S01] `tests/hierarchy-operations/`に受け入れテストを追加し、`pnpm test`で未実装による失敗を確認する。
- [x] 2.2 [REQ-023/REQ-023-S01] `packages/webview/src/features と packages/extension/src/storage`を実装し、`pnpm test`で該当シナリオが成功することを確認する。
- [x] 2.3 [REQ-023/REQ-023-S01] テスト名と公開責務にIDを記載し、[台帳](../../../traceability.md)へ実装、テスト、検証結果の実在パスを記録する。

## 3. 完了の切り替え

設計: [D-01](design.md#d-01---責務とデータ境界)、[D-02](design.md#d-02---表示更新と検証)、[D-03](design.md#d-03---項目操作のコマンド化)。

- [x] 3.1 [REQ-024/REQ-024-S01、REQ-024-S02] `tests/hierarchy-operations/`に受け入れテストを追加し、`pnpm test`で未実装による失敗を確認する。
- [x] 3.2 [REQ-024/REQ-024-S01、REQ-024-S02] `packages/webview/src/features と packages/extension/src/storage`を実装し、`pnpm test`で該当シナリオが成功することを確認する。
- [x] 3.3 [REQ-024/REQ-024-S01、REQ-024-S02] テスト名と公開責務にIDを記載し、[台帳](../../../traceability.md)へ実装、テスト、検証結果の実在パスを記録する。

## 4. 確認付き物理削除

設計: [D-01](design.md#d-01---責務とデータ境界)、[D-02](design.md#d-02---表示更新と検証)、[D-03](design.md#d-03---項目操作のコマンド化)。

- [x] 4.1 [REQ-025/REQ-025-S01、REQ-025-S02] `tests/hierarchy-operations/`に受け入れテストを追加し、`pnpm test`で未実装による失敗を確認する。
- [x] 4.2 [REQ-025/REQ-025-S01、REQ-025-S02] `packages/webview/src/features と packages/extension/src/storage`を実装し、`pnpm test`で該当シナリオが成功することを確認する。
- [x] 4.3 [REQ-025/REQ-025-S01、REQ-025-S02] テスト名と公開責務にIDを記載し、[台帳](../../../traceability.md)へ実装、テスト、検証結果の実在パスを記録する。

## 5. 全体の整合性と検証

設計: [D-02](design.md#d-02---表示更新と検証)。

- [x] 5.1 [REQ-022、REQ-023、REQ-024、REQ-025] `pnpm test`、`pnpm typecheck`、`pnpm check`、`pnpm check:fsd`を実行し、対象シナリオと品質ゲートの成功を台帳に記録する。
- [x] 5.2 [REQ-022、REQ-023、REQ-024、REQ-025] `openspec validate hierarchy-operations --strict`とOpenSpec verifyを行い、要件、シナリオ、設計、タスク、実装、テストの対応を確認する。

## Workflow follow-up

- [設定](../../../config.yaml)のarchive運用に従ってアーカイブし、正式仕様と[仕様案内](../../../specs/README.md)のリンクを更新する。

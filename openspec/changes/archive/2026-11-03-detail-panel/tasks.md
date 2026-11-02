# Tasks

## 1. 詳細パネルの表示

設計: [D-01](design.md#d-01---責務とデータ境界)、[D-02](design.md#d-02---表示更新と検証)、[D-03](design.md#d-03---共通パネルと安全なリンク)。

- [x] 1.1 [REQ-026/REQ-026-S01、REQ-026-S02] `tests/detail-panel/`に受け入れテストを追加し、`pnpm test`で未実装による失敗を確認する。
- [x] 1.2 [REQ-026/REQ-026-S01、REQ-026-S02] `packages/webview/src/widgets/detail-panel`を実装し、`pnpm test`で該当シナリオが成功することを確認する。
- [x] 1.3 [REQ-026/REQ-026-S01、REQ-026-S02] テスト名と公開責務にIDを記載し、[台帳](../../../traceability.md)へ実装、テスト、検証結果の実在パスを記録する。

## 2. 詳細編集

設計: [D-01](design.md#d-01---責務とデータ境界)、[D-02](design.md#d-02---表示更新と検証)、[D-03](design.md#d-03---共通パネルと安全なリンク)。

- [x] 2.1 [REQ-027/REQ-027-S01、REQ-027-S02] `tests/detail-panel/`に受け入れテストを追加し、`pnpm test`で未実装による失敗を確認する。
- [x] 2.2 [REQ-027/REQ-027-S01、REQ-027-S02] `packages/webview/src/widgets/detail-panel`を実装し、`pnpm test`で該当シナリオが成功することを確認する。
- [x] 2.3 [REQ-027/REQ-027-S01、REQ-027-S02] テスト名と公開責務にIDを記載し、[台帳](../../../traceability.md)へ実装、テスト、検証結果の実在パスを記録する。

## 3. 補足とリンク

設計: [D-01](design.md#d-01---責務とデータ境界)、[D-02](design.md#d-02---表示更新と検証)、[D-03](design.md#d-03---共通パネルと安全なリンク)。

- [x] 3.1 [REQ-028/REQ-028-S01、REQ-028-S02] `tests/detail-panel/`に受け入れテストを追加し、`pnpm test`で未実装による失敗を確認する。
- [x] 3.2 [REQ-028/REQ-028-S01、REQ-028-S02] `packages/webview/src/widgets/detail-panel`を実装し、`pnpm test`で該当シナリオが成功することを確認する。
- [x] 3.3 [REQ-028/REQ-028-S01、REQ-028-S02] テスト名と公開責務にIDを記載し、[台帳](../../../traceability.md)へ実装、テスト、検証結果の実在パスを記録する。

## 4. 全体の整合性と検証

設計: [D-02](design.md#d-02---表示更新と検証)。

- [x] 4.1 [REQ-026、REQ-027、REQ-028] `pnpm test`、`pnpm typecheck`、`pnpm check`、`pnpm check:fsd`を実行し、対象シナリオと品質ゲートの成功を台帳に記録する。
- [x] 4.2 [REQ-026、REQ-027、REQ-028] `openspec validate detail-panel --strict`とOpenSpec verifyを行い、要件、シナリオ、設計、タスク、実装、テストの対応を確認する。

## Workflow follow-up

- [設定](../../../config.yaml)のarchive運用に従ってアーカイブし、正式仕様と[仕様案内](../../../specs/README.md)のリンクを更新する。

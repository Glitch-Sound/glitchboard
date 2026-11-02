# Tasks

## 1. 4階層の管理

設計: [D-01](design.md#d-01---責務とデータ境界)、[D-02](design.md#d-02---表示更新と検証)、[D-03](design.md#d-03---YAMLの具体構造と保存)。

- [x] 1.1 [REQ-001/REQ-001-S01、REQ-001-S02] `tests/data-persistence/`に受け入れテストを追加し、`pnpm test`で未実装による失敗を確認する。
- [x] 1.2 [REQ-001/REQ-001-S01、REQ-001-S02] `packages/shared/src/domain と packages/extension/src/storage`を実装し、`pnpm test`で該当シナリオが成功することを確認する。
- [x] 1.3 [REQ-001/REQ-001-S01、REQ-001-S02] テスト名と公開責務にIDを記載し、[台帳](../../../traceability.md)へ実装、テスト、検証結果の実在パスを記録する。

## 2. 管理ファイルの配置

設計: [D-01](design.md#d-01---責務とデータ境界)、[D-02](design.md#d-02---表示更新と検証)、[D-03](design.md#d-03---YAMLの具体構造と保存)。

- [x] 2.1 [REQ-002/REQ-002-S01、REQ-002-S02] `tests/data-persistence/`に受け入れテストを追加し、`pnpm test`で未実装による失敗を確認する。
- [x] 2.2 [REQ-002/REQ-002-S01、REQ-002-S02] `packages/shared/src/domain と packages/extension/src/storage`を実装し、`pnpm test`で該当シナリオが成功することを確認する。
- [x] 2.3 [REQ-002/REQ-002-S01、REQ-002-S02] テスト名と公開責務にIDを記載し、[台帳](../../../traceability.md)へ実装、テスト、検証結果の実在パスを記録する。

## 3. 読込対象の切り替え

設計: [D-01](design.md#d-01---責務とデータ境界)、[D-02](design.md#d-02---表示更新と検証)、[D-03](design.md#d-03---YAMLの具体構造と保存)。

- [x] 3.1 [REQ-003/REQ-003-S01] `tests/data-persistence/`に受け入れテストを追加し、`pnpm test`で未実装による失敗を確認する。
- [x] 3.2 [REQ-003/REQ-003-S01] `packages/shared/src/domain と packages/extension/src/storage`を実装し、`pnpm test`で該当シナリオが成功することを確認する。
- [x] 3.3 [REQ-003/REQ-003-S01] テスト名と公開責務にIDを記載し、[台帳](../../../traceability.md)へ実装、テスト、検証結果の実在パスを記録する。

## 4. YAML検証と保全

設計: [D-01](design.md#d-01---責務とデータ境界)、[D-02](design.md#d-02---表示更新と検証)、[D-03](design.md#d-03---YAMLの具体構造と保存)。

- [x] 4.1 [REQ-004/REQ-004-S01、REQ-004-S02] `tests/data-persistence/`に受け入れテストを追加し、`pnpm test`で未実装による失敗を確認する。
- [x] 4.2 [REQ-004/REQ-004-S01、REQ-004-S02] `packages/shared/src/domain と packages/extension/src/storage`を実装し、`pnpm test`で該当シナリオが成功することを確認する。
- [x] 4.3 [REQ-004/REQ-004-S01、REQ-004-S02] テスト名と公開責務にIDを記載し、[台帳](../../../traceability.md)へ実装、テスト、検証結果の実在パスを記録する。

## 5. 識別子とファイル名

設計: [D-01](design.md#d-01---責務とデータ境界)、[D-02](design.md#d-02---表示更新と検証)、[D-03](design.md#d-03---YAMLの具体構造と保存)。

- [x] 5.1 [REQ-005/REQ-005-S01、REQ-005-S02] `tests/data-persistence/`に受け入れテストを追加し、`pnpm test`で未実装による失敗を確認する。
- [x] 5.2 [REQ-005/REQ-005-S01、REQ-005-S02] `packages/shared/src/domain と packages/extension/src/storage`を実装し、`pnpm test`で該当シナリオが成功することを確認する。
- [x] 5.3 [REQ-005/REQ-005-S01、REQ-005-S02] テスト名と公開責務にIDを記載し、[台帳](../../../traceability.md)へ実装、テスト、検証結果の実在パスを記録する。

## 6. 全体の整合性と検証

設計: [D-02](design.md#d-02---表示更新と検証)。

- [x] 6.1 [REQ-001、REQ-002、REQ-003、REQ-004、REQ-005] `pnpm test`、`pnpm typecheck`、`pnpm check`、`pnpm check:fsd`を実行し、対象シナリオと品質ゲートの成功を台帳に記録する。
- [x] 6.2 [REQ-001、REQ-002、REQ-003、REQ-004、REQ-005] `openspec validate data-persistence --strict`とOpenSpec verifyを行い、要件、シナリオ、設計、タスク、実装、テストの対応を確認する。

## Workflow follow-up

- [設定](../../../config.yaml)のarchive運用に従ってアーカイブし、正式仕様と[仕様案内](../../../specs/README.md)のリンクを更新する。

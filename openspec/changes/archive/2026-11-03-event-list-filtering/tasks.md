# Tasks

## 1. 期限順とグループ

設計: [D-01](design.md#d-01---責務とデータ境界)、[D-02](design.md#d-02---表示更新と検証)、[D-03](design.md#d-03---グループと選択の共有)。

- [x] 1.1 [REQ-019/REQ-019-S01、REQ-019-S02] `tests/event-list-filtering/`に受け入れテストを追加し、`pnpm test`で未実装による失敗を確認する。
- [x] 1.2 [REQ-019/REQ-019-S01、REQ-019-S02] `packages/webview/src/pages/event-list`を実装し、`pnpm test`で該当シナリオが成功することを確認する。
- [x] 1.3 [REQ-019/REQ-019-S01、REQ-019-S02] テスト名と公開責務にIDを記載し、[台帳](../../../traceability.md)へ実装、テスト、検証結果の実在パスを記録する。

## 2. 抽出条件とProject切り替え

設計: [D-01](design.md#d-01---責務とデータ境界)、[D-02](design.md#d-02---表示更新と検証)、[D-03](design.md#d-03---グループと選択の共有)。

- [x] 2.1 [REQ-020/REQ-020-S01、REQ-020-S02] `tests/event-list-filtering/`に受け入れテストを追加し、`pnpm test`で未実装による失敗を確認する。
- [x] 2.2 [REQ-020/REQ-020-S01、REQ-020-S02] `packages/webview/src/pages/event-list`を実装し、`pnpm test`で該当シナリオが成功することを確認する。
- [x] 2.3 [REQ-020/REQ-020-S01、REQ-020-S02] テスト名と公開責務にIDを記載し、[台帳](../../../traceability.md)へ実装、テスト、検証結果の実在パスを記録する。

## 3. Eventへの移動

設計: [D-01](design.md#d-01---責務とデータ境界)、[D-02](design.md#d-02---表示更新と検証)、[D-03](design.md#d-03---グループと選択の共有)。

- [x] 3.1 [REQ-021/REQ-021-S01] `tests/event-list-filtering/`に受け入れテストを追加し、`pnpm test`で未実装による失敗を確認する。
- [x] 3.2 [REQ-021/REQ-021-S01] `packages/webview/src/pages/event-list`を実装し、`pnpm test`で該当シナリオが成功することを確認する。
- [x] 3.3 [REQ-021/REQ-021-S01] テスト名と公開責務にIDを記載し、[台帳](../../../traceability.md)へ実装、テスト、検証結果の実在パスを記録する。

## 4. 全体の整合性と検証

設計: [D-02](design.md#d-02---表示更新と検証)。

- [x] 4.1 [REQ-019、REQ-020、REQ-021] `pnpm test`、`pnpm typecheck`、`pnpm check`、`pnpm check:fsd`を実行し、対象シナリオと品質ゲートの成功を台帳に記録する。
- [x] 4.2 [REQ-019、REQ-020、REQ-021] `openspec validate event-list-filtering --strict`とOpenSpec verifyを行い、要件、シナリオ、設計、タスク、実装、テストの対応を確認する。

## Workflow follow-up

- [設定](../../../config.yaml)のarchive運用に従ってアーカイブし、正式仕様と[仕様案内](../../../specs/README.md)のリンクを更新する。

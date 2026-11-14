# Tasks

## 1. 表示期間

設計: [D-01](design.md#d-01---責務とデータ境界)、[D-02](design.md#d-02---表示更新と検証)、[D-03](design.md#d-03---タイムラインと負荷の描画)。

- [x] 1.1 [REQ-015/REQ-015-S01] `tests/board-timeline/`に受け入れテストを追加し、`pnpm test`で未実装による失敗を確認する。
- [x] 1.2 [REQ-015/REQ-015-S01] `packages/webview/src/pages/board と widgets`を実装し、`pnpm test`で該当シナリオが成功することを確認する。
- [x] 1.3 [REQ-015/REQ-015-S01] テスト名と公開責務にIDを記載し、[台帳](../../../traceability.md)へ実装、テスト、検証結果の実在パスを記録する。

## 2. Project別の期限タイムライン

設計: [D-01](design.md#d-01---責務とデータ境界)、[D-02](design.md#d-02---表示更新と検証)、[D-03](design.md#d-03---タイムラインと負荷の描画)。

- [x] 2.1 [REQ-016/REQ-016-S01、REQ-016-S02] `tests/board-timeline/`に受け入れテストを追加し、`pnpm test`で未実装による失敗を確認する。
- [x] 2.2 [REQ-016/REQ-016-S01、REQ-016-S02] `packages/webview/src/pages/board と widgets`を実装し、`pnpm test`で該当シナリオが成功することを確認する。
- [x] 2.3 [REQ-016/REQ-016-S01、REQ-016-S02] テスト名と公開責務にIDを記載し、[台帳](../../../traceability.md)へ実装、テスト、検証結果の実在パスを記録する。

## 3. ヘッダーと必要ペースグラフ

設計: [D-01](design.md#d-01---責務とデータ境界)、[D-02](design.md#d-02---表示更新と検証)、[D-03](design.md#d-03---タイムラインと負荷の描画)。

- [x] 3.1 [REQ-017/REQ-017-S01、REQ-017-S02] `tests/board-timeline/`に受け入れテストを追加し、`pnpm test`で未実装による失敗を確認する。
- [x] 3.2 [REQ-017/REQ-017-S01、REQ-017-S02] `packages/webview/src/pages/board と widgets`を実装し、`pnpm test`で該当シナリオが成功することを確認する。
- [x] 3.3 [REQ-017/REQ-017-S01、REQ-017-S02] テスト名と公開責務にIDを記載し、[台帳](../../../traceability.md)へ実装、テスト、検証結果の実在パスを記録する。

## 4. Event詳細エリア

設計: [D-01](design.md#d-01---責務とデータ境界)、[D-02](design.md#d-02---表示更新と検証)、[D-03](design.md#d-03---タイムラインと負荷の描画)。

- [x] 4.1 [REQ-018/REQ-018-S01、REQ-018-S02] `tests/board-timeline/`に受け入れテストを追加し、`pnpm test`で未実装による失敗を確認する。
- [x] 4.2 [REQ-018/REQ-018-S01、REQ-018-S02] `packages/webview/src/pages/board と widgets`を実装し、`pnpm test`で該当シナリオが成功することを確認する。
- [x] 4.3 [REQ-018/REQ-018-S01、REQ-018-S02] テスト名と公開責務にIDを記載し、[台帳](../../../traceability.md)へ実装、テスト、検証結果の実在パスを記録する。

## 5. テーマ追従

設計: [D-01](design.md#d-01---責務とデータ境界)、[D-02](design.md#d-02---表示更新と検証)、[D-03](design.md#d-03---タイムラインと負荷の描画)。

- [x] 5.1 [NREQ-003/NREQ-003-S01] `tests/board-timeline/`に受け入れテストを追加し、`pnpm test`で未実装による失敗を確認する。
- [x] 5.2 [NREQ-003/NREQ-003-S01] `packages/webview/src/pages/board と widgets`を実装し、`pnpm test`で該当シナリオが成功することを確認する。
- [x] 5.3 [NREQ-003/NREQ-003-S01] テスト名と公開責務にIDを記載し、[台帳](../../../traceability.md)へ実装、テスト、検証結果の実在パスを記録する。

## 6. 全体の整合性と検証

設計: [D-02](design.md#d-02---表示更新と検証)。

- [x] 6.1 [REQ-015、REQ-016、REQ-017、REQ-018、NREQ-003] `pnpm test`、`pnpm typecheck`、`pnpm check`、`pnpm check:fsd`を実行し、対象シナリオと品質ゲートの成功を台帳に記録する。
- [x] 6.2 [REQ-015、REQ-016、REQ-017、REQ-018、NREQ-003] `openspec validate board-timeline --strict`とOpenSpec verifyを行い、要件、シナリオ、設計、タスク、実装、テストの対応を確認する。

## Workflow follow-up

- [設定](../../../config.yaml)のarchive運用に従ってアーカイブし、正式仕様と[仕様案内](../../../specs/README.md)のリンクを更新する。

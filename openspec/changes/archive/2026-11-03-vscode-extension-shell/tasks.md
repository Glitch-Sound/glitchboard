# Tasks

## 1. 二つの表示面

設計: [D-01](design.md#d-01---責務とデータ境界)、[D-02](design.md#d-02---表示更新と検証)、[D-04](design.md#d-04---二つのWebviewの同期)。

- [x] 1.1 [REQ-012/REQ-012-S01] `tests/vscode-extension-shell/`に受け入れテストを追加し、`pnpm test`で未実装による失敗を確認する。
- [x] 1.2 [REQ-012/REQ-012-S01] `packages/extension と packages/webview`を実装し、`pnpm test`で該当シナリオが成功することを確認する。
- [x] 1.3 [REQ-012/REQ-012-S01] テスト名と公開責務にIDを記載し、[台帳](../../../traceability.md)へ実装、テスト、検証結果の実在パスを記録する。

## 2. 状態同期と外部変更

設計: [D-01](design.md#d-01---責務とデータ境界)、[D-02](design.md#d-02---表示更新と検証)、[D-04](design.md#d-04---二つのWebviewの同期)。

- [x] 2.1 [REQ-013/REQ-013-S01、REQ-013-S02] `tests/vscode-extension-shell/`に受け入れテストを追加し、`pnpm test`で未実装による失敗を確認する。
- [x] 2.2 [REQ-013/REQ-013-S01、REQ-013-S02] `packages/extension と packages/webview`を実装し、`pnpm test`で該当シナリオが成功することを確認する。
- [x] 2.3 [REQ-013/REQ-013-S01、REQ-013-S02] テスト名と公開責務にIDを記載し、[台帳](../../../traceability.md)へ実装、テスト、検証結果の実在パスを記録する。

## 3. 検証済みメッセージ

設計: [D-01](design.md#d-01---責務とデータ境界)、[D-02](design.md#d-02---表示更新と検証)、[D-04](design.md#d-04---二つのWebviewの同期)。

- [x] 3.1 [REQ-014/REQ-014-S01] `tests/vscode-extension-shell/`に受け入れテストを追加し、`pnpm test`で未実装による失敗を確認する。
- [x] 3.2 [REQ-014/REQ-014-S01] `packages/extension と packages/webview`を実装し、`pnpm test`で該当シナリオが成功することを確認する。
- [x] 3.3 [REQ-014/REQ-014-S01] テスト名と公開責務にIDを記載し、[台帳](../../../traceability.md)へ実装、テスト、検証結果の実在パスを記録する。

## 4. オフライン動作

設計: [D-01](design.md#d-01---責務とデータ境界)、[D-02](design.md#d-02---表示更新と検証)、[D-04](design.md#d-04---二つのWebviewの同期)。

- [x] 4.1 [NREQ-001/NREQ-001-S01] `tests/vscode-extension-shell/`に受け入れテストを追加し、`pnpm test`で未実装による失敗を確認する。
- [x] 4.2 [NREQ-001/NREQ-001-S01] `packages/extension と packages/webview`を実装し、`pnpm test`で該当シナリオが成功することを確認する。
- [x] 4.3 [NREQ-001/NREQ-001-S01] テスト名と公開責務にIDを記載し、[台帳](../../../traceability.md)へ実装、テスト、検証結果の実在パスを記録する。

## 5. 開発基盤

設計: [D-03](design.md#d-03---開発基盤と品質ゲート)。

- [x] 5.1 [支援: D-03] ルートと3パッケージのpnpmワークスペース、Vite、Vitest、React Testing Library、Playwright、Zod、Zustand、Tailwind CSS、shadcn/ui、React Hook Form、date-fns、yaml、祝日データ、vsceの依存を設定し、`pnpm install --frozen-lockfile`で再現できることを確認する。
- [x] 5.2 [支援: D-03] WebviewをFSD v2.1に配置し、Steigerと公式FSDプラグインの検査を設定して、`pnpm check:fsd`の成功を確認する。
- [x] 5.3 [支援: D-03] Lefthookのpre-commitにBiome check、tsc typecheck、FSD検査を設定し、違反した変更でコミットが止まることを確認する。
- [x] 5.4 [支援: D-03] [台帳](../../../traceability.md)の支援変更一覧に設定ファイル、検証コマンド、結果を記録する。

## 6. 全体の整合性と検証

設計: [D-02](design.md#d-02---表示更新と検証)。

- [x] 6.1 [REQ-012、REQ-013、REQ-014、NREQ-001] `pnpm test`、`pnpm typecheck`、`pnpm check`、`pnpm check:fsd`を実行し、対象シナリオと品質ゲートの成功を台帳に記録する。
- [x] 6.2 [REQ-012、REQ-013、REQ-014、NREQ-001] `openspec validate vscode-extension-shell --strict`とOpenSpec verifyを行い、要件、シナリオ、設計、タスク、実装、テストの対応を確認する。

## Workflow follow-up

- [設定](../../../config.yaml)のarchive運用に従ってアーカイブし、正式仕様と[仕様案内](../../../specs/README.md)のリンクを更新する。

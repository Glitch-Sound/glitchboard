# Design

## Context

- 提案: [proposal.md](proposal.md)。
- 対象仕様: [spec.md](specs/vscode-integration/spec.md)。
- 前提と制約: [技術方針](../../../tech.md)、[構造方針](../../../structure.md)。
- 影響する境界: packages/extension と packages/webview。

## Goals / Non-Goals

**Goals:**

- VS Code拡張の表示基盤の全受け入れ例を成立させる。\
**Non-Goals:**

- 他の変更の振る舞いをこの変更で実装しない。

## Decisions

### D-01 - 責務とデータ境界

- 対象: REQ-012、REQ-013、REQ-014、NREQ-001。
- 選択: packages/extension と packages/webviewに責務を配置する。\
  計算はshared、永続化とVS Code APIはextension、画面はwebviewに置く。
- 理由: [技術方針](../../../tech.md)の依存方向とオフライン要件を守れる。
- 代替案: WebviewがYAMLを直接操作する方式は、VS Code APIと検証境界を分散させるため採用しない。
- 配置と依存: packages/extension と packages/webview。\
  通信型はpackages/sharedに置き、境界でZod検証する。
- データと日付: YAMLの更新では対象外のコメントを保持し、日付は日本時間のYYYY-MM-DDとして扱う。\
  該当しない機能では変更しない。

### D-02 - 表示更新と検証

- 対象: REQ-012、REQ-013、REQ-014、NREQ-001。
- 選択: 受け入れ例をID付きテストで先に固定し、保存または状態変更の後に単一の検証済みスナップショットを配信する。
- 理由: ボードとEVENT一覧の不一致を防ぎ、各シナリオを独立して検証できる。
- 代替案: 画面ごとの個別再計算は差分が生じやすいため採用しない。
- 配置と依存: packages/extension と packages/webviewのテストとpackages/sharedの純粋関数テストを使う。
- データと日付: 学習中、休日、未見積、期限切れは該当シナリオの入力として固定する。

### D-03 - 開発基盤と品質ゲート

- 対象: 開発支援作業。
- 選択: pnpmワークスペースをshared、extension、webviewの3パッケージに分け、webviewへFSD v2.1を適用する。
- 理由: 実行境界と静的検査の責務を一致させる。
- 代替案: 単一パッケージは境界違反を検出しづらいため採用しない。
- 配置と依存: ルートのpnpm-workspace.yaml、biome.json、steiger.config.ts、lefthook.ymlに設定を置く。\
  pre-commitでBiome check、tsc typecheck、Steigerと公式FSDプラグインを実行する。
- データと日付: 開発基盤の設定は製品YAMLと日付の形式を変更しない。

### D-04 - 二つのWebviewの同期

- 対象: REQ-012～REQ-014、NREQ-001。
- 選択: Extensionを管理データの唯一の書込み主体とする。\
  Webviewからの操作をZodで検証し、保存後の版番号付きスナップショットをボードとEVENT一覧へ配信する。\
  ファイル監視は短時間の連続変更をまとめて再読込する。
- 理由: 二つの表示面を同じデータ版へ収束させられる。
- 代替案: 両Webviewが別々にYAMLを読む方式は競合と表示差を招くため採用しない。
- 配置と依存: packages/sharedにメッセージスキーマ、packages/extensionに通信と監視、packages/webviewに二つの入口を置く。
- データと日付: 該当する保存形式、休日、学習中、テーマ、オフラインの条件は対象仕様に従う。

## Traceability

| 要件ID | シナリオID | 設計節 | 実装予定箇所 | 検証方法とテスト予定 |
| --- | --- | --- | --- | --- |
| REQ-012 | REQ-012-S01 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/extension と packages/webview` | `tests/vscode-extension-shell/req-012-s01.test.ts`で「表示面を開く」を確認 |
| REQ-013 | REQ-013-S01 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/extension と packages/webview` | `tests/vscode-extension-shell/req-013-s01.test.ts`で「外部変更」を確認 |
| REQ-013 | REQ-013-S02 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/extension と packages/webview` | `tests/vscode-extension-shell/req-013-s02.test.ts`で「不正な外部変更」を確認 |
| REQ-014 | REQ-014-S01 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/extension と packages/webview` | `tests/vscode-extension-shell/req-014-s01.test.ts`で「不正なポイント」を確認 |
| NREQ-001 | NREQ-001-S01 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/extension と packages/webview` | `tests/vscode-extension-shell/nreq-001-s01.test.ts`で「ネットワーク遮断」を確認 |

## Verification Plan

- 正常、境界、異常: Traceabilityの各テストで仕様のGIVEN、WHEN、THENを確認する。\
  自動化しにくいVS Codeの実表示とテーマは手動確認し、結果を台帳へ記録する。
- 非機能要件: 対象NREQのシナリオに記載した環境、データ、指標を使う。\
  該当しない場合は対象外とする。
- 手動確認: VS Code安定版でダーク・ライトテーマとサイドバー・エディタの動作を確認し、スクリーンショットを検証記録に添える。
- 全体検証: `pnpm test`、`pnpm typecheck`、`pnpm check`、`pnpm check:fsd`と`openspec validate vscode-extension-shell --strict`を実行し、失敗0件を確認する。

## Risks / Trade-offs

| 対象IDまたは設計節 | リスクや制約 | 対処と検証 |
| --- | --- | --- |
| REQ-012、REQ-013、REQ-014、NREQ-001 | 複数変更の実装順により依存先が未実装となる | データ、計算、拡張、画面の順に適用し、契約テストで確認する |

## Migration Plan

新規機能のため既存管理データの移行はない。\
失敗時は変更前のGitコミットと管理データの履歴へ戻す。

## Open Questions

なし。\
具体案の採用はproposal.mdのReadinessに従いレビュー時に確認する。

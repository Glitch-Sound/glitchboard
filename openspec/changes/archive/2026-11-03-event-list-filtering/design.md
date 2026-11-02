# Design

## Context

- 提案: [proposal.md](proposal.md)。
- 対象仕様: [spec.md](specs/event-navigation/spec.md)。
- 前提と制約: [技術方針](../../../tech.md)、[構造方針](../../../structure.md)。
- 影響する境界: packages/webview/src/pages/event-list。

## Goals / Non-Goals

**Goals:**

- EVENT一覧と抽出の全受け入れ例を成立させる。

**Non-Goals:**

- 他の変更の振る舞いをこの変更で実装しない。

## Decisions

### D-01 - 責務とデータ境界

- 対象: REQ-019、REQ-020、REQ-021。
- 選択: packages/webview/src/pages/event-listに責務を配置する。計算はshared、永続化とVS Code APIはextension、画面はwebviewに置く。
- 理由: [技術方針](../../../tech.md)の依存方向とオフライン要件を守れる。
- 代替案: WebviewがYAMLを直接操作する方式は、VS Code APIと検証境界を分散させるため採用しない。
- 配置と依存: packages/webview/src/pages/event-list。通信型はpackages/sharedに置き、境界でZod検証する。
- データと日付: YAMLの更新では対象外のコメントを保持し、日付は日本時間のYYYY-MM-DDとして扱う。該当しない機能では変更しない。

### D-02 - 表示更新と検証

- 対象: REQ-019、REQ-020、REQ-021。
- 選択: 受け入れ例をID付きテストで先に固定し、保存または状態変更の後に単一の検証済みスナップショットを配信する。
- 理由: ボードとEVENT一覧の不一致を防ぎ、各シナリオを独立して検証できる。
- 代替案: 画面ごとの個別再計算は差分が生じやすいため採用しない。
- 配置と依存: packages/webview/src/pages/event-listのテストとpackages/sharedの純粋関数テストを使う。
- データと日付: 学習中、休日、未見積、期限切れは該当シナリオの入力として固定する。

### D-03 - グループと選択の共有

- 対象: REQ-019～REQ-021。
- 選択: 読込Project内のEventを完了状態と期限で分類し、各グループを期限とIDで安定ソートする。抽出条件はWebviewの状態に、Projectのloadはmanage.yamlに保存する。行クリックはExtensionのコマンド経由でボードを開きEvent IDを渡す。
- 理由: 期限切れを含む未完了一覧と永続化するProject選択を区別できる。
- 代替案: サイドバーだけで選択を保持する方式はボードとの同期が崩れるため採用しない。
- 配置と依存: packages/webview/src/pages/event-listに表示、packages/sharedに分類、packages/extensionにボード起動を置く。
- データと日付: 該当する保存形式、休日、学習中、テーマ、オフラインの条件は対象仕様に従う。

## Traceability

| 要件ID | シナリオID | 設計節 | 実装予定箇所 | 検証方法とテスト予定 |
| --- | --- | --- | --- | --- |
| REQ-019 | REQ-019-S01 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/webview/src/pages/event-list` | `tests/event-list-filtering/req-019-s01.test.ts`で「日曜の境界」を確認 |
| REQ-019 | REQ-019-S02 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/webview/src/pages/event-list` | `tests/event-list-filtering/req-019-s02.test.ts`で「完了済み」を確認 |
| REQ-020 | REQ-020-S01 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/webview/src/pages/event-list` | `tests/event-list-filtering/req-020-s01.test.ts`で「期限切れの包含」を確認 |
| REQ-020 | REQ-020-S02 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/webview/src/pages/event-list` | `tests/event-list-filtering/req-020-s02.test.ts`で「読込切り替え」を確認 |
| REQ-021 | REQ-021-S01 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/webview/src/pages/event-list` | `tests/event-list-filtering/req-021-s01.test.ts`で「サイドバーから移動」を確認 |

## Verification Plan

- 正常、境界、異常: Traceabilityの各テストで仕様のGIVEN、WHEN、THENを確認する。自動化しにくいVS Codeの実表示とテーマは手動確認し、結果を台帳へ記録する。
- 非機能要件: 対象NREQのシナリオに記載した環境、データ、指標を使う。該当しない場合は対象外とする。
- 手動確認: VS Code安定版でダーク・ライトテーマとサイドバー・エディタの動作を確認し、スクリーンショットを検証記録に添える。
- 全体検証: `pnpm test`、`pnpm typecheck`、`pnpm check`、`pnpm check:fsd`と`openspec validate event-list-filtering --strict`を実行し、失敗0件を確認する。

## Risks / Trade-offs

| 対象IDまたは設計節 | リスクや制約 | 対処と検証 |
| --- | --- | --- |
| REQ-019、REQ-020、REQ-021 | 複数変更の実装順により依存先が未実装となる | データ、計算、拡張、画面の順に適用し、契約テストで確認する |

## Migration Plan

新規機能のため既存管理データの移行はない。失敗時は変更前のGitコミットと管理データの履歴へ戻す。

## Open Questions

なし。具体案の採用はproposal.mdのReadinessに従いレビュー時に確認する。

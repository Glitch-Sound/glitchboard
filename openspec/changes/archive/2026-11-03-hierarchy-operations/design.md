# Design

## Context

- 提案: [proposal.md](proposal.md)。
- 対象仕様: [spec.md](specs/hierarchy-editing/spec.md)。
- 前提と制約: [技術方針](../../../tech.md)、[構造方針](../../../structure.md)。
- 影響する境界: packages/webview/src/features と packages/extension/src/storage。

## Goals / Non-Goals

**Goals:**

- 階層の追加・変更・削除の全受け入れ例を成立させる。\
**Non-Goals:**

- 他の変更の振る舞いをこの変更で実装しない。

## Decisions

### D-01 - 責務とデータ境界

- 対象: REQ-022、REQ-023、REQ-024、REQ-025。
- 選択: packages/webview/src/features と packages/extension/src/storageに責務を配置する。\
  計算はshared、永続化とVS Code APIはextension、画面はwebviewに置く。
- 理由: [技術方針](../../../tech.md)の依存方向とオフライン要件を守れる。
- 代替案: WebviewがYAMLを直接操作する方式は、VS Code APIと検証境界を分散させるため採用しない。
- 配置と依存: packages/webview/src/features と packages/extension/src/storage。\
  通信型はpackages/sharedに置き、境界でZod検証する。
- データと日付: YAMLの更新では対象外のコメントを保持し、日付は日本時間のYYYY-MM-DDとして扱う。\
  該当しない機能では変更しない。

### D-02 - 表示更新と検証

- 対象: REQ-022、REQ-023、REQ-024、REQ-025。
- 選択: 受け入れ例をID付きテストで先に固定し、保存または状態変更の後に単一の検証済みスナップショットを配信する。
- 理由: ボードとEVENT一覧の不一致を防ぎ、各シナリオを独立して検証できる。
- 代替案: 画面ごとの個別再計算は差分が生じやすいため採用しない。
- 配置と依存: packages/webview/src/features と packages/extension/src/storageのテストとpackages/sharedの純粋関数テストを使う。
- データと日付: 学習中、休日、未見積、期限切れは該当シナリオの入力として固定する。

### D-03 - 項目操作のコマンド化

- 対象: REQ-022～REQ-025。
- 選択: 追加、ポイント、完了、削除をID指定のコマンドとしてExtensionへ送る。\
  削除前の子孫件数は同じ検証済みデータ版から求め、保存直前に再確認する。\
  完了日はAsia/Tokyoで採番し、Taskのポイント変更後に集計スナップショットを再生成する。
- 理由: 画面操作とYAML更新の競合を抑え、削除件数を正しく示せる。
- 代替案: Webview側だけで削除対象を確定する方式は外部変更時に誤削除するため採用しない。
- 配置と依存: packages/webview/src/featuresに操作、packages/extension/src/storageに保存、packages/sharedにコマンドスキーマを置く。
- データと日付: 該当する保存形式、休日、学習中、テーマ、オフラインの条件は対象仕様に従う。

## Traceability

| 要件ID | シナリオID | 設計節 | 実装予定箇所 | 検証方法とテスト予定 |
| --- | --- | --- | --- | --- |
| REQ-022 | REQ-022-S01 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/webview/src/features と packages/extension/src/storage` | `tests/hierarchy-operations/req-022-s01.test.ts`で「Event追加」を確認 |
| REQ-022 | REQ-022-S02 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/webview/src/features と packages/extension/src/storage` | `tests/hierarchy-operations/req-022-s02.test.ts`で「取消」を確認 |
| REQ-023 | REQ-023-S01 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/webview/src/features と packages/extension/src/storage` | `tests/hierarchy-operations/req-023-s01.test.ts`で「未見積を設定」を確認 |
| REQ-024 | REQ-024-S01 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/webview/src/features と packages/extension/src/storage` | `tests/hierarchy-operations/req-024-s01.test.ts`で「完了と解除」を確認 |
| REQ-024 | REQ-024-S02 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/webview/src/features と packages/extension/src/storage` | `tests/hierarchy-operations/req-024-s02.test.ts`で「完了解除」を確認 |
| REQ-025 | REQ-025-S01 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/webview/src/features と packages/extension/src/storage` | `tests/hierarchy-operations/req-025-s01.test.ts`で「子孫の確認」を確認 |
| REQ-025 | REQ-025-S02 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/webview/src/features と packages/extension/src/storage` | `tests/hierarchy-operations/req-025-s02.test.ts`で「取消」を確認 |

## Verification Plan

- 正常、境界、異常: Traceabilityの各テストで仕様のGIVEN、WHEN、THENを確認する。\
  自動化しにくいVS Codeの実表示とテーマは手動確認し、結果を台帳へ記録する。
- 非機能要件: 対象NREQのシナリオに記載した環境、データ、指標を使う。\
  該当しない場合は対象外とする。
- 手動確認: VS Code安定版でダーク・ライトテーマとサイドバー・エディタの動作を確認し、スクリーンショットを検証記録に添える。
- 全体検証: `pnpm test`、`pnpm typecheck`、`pnpm check`、`pnpm check:fsd`と`openspec validate hierarchy-operations --strict`を実行し、失敗0件を確認する。

## Risks / Trade-offs

| 対象IDまたは設計節 | リスクや制約 | 対処と検証 |
| --- | --- | --- |
| REQ-022、REQ-023、REQ-024、REQ-025 | 複数変更の実装順により依存先が未実装となる | データ、計算、拡張、画面の順に適用し、契約テストで確認する |

## Migration Plan

新規機能のため既存管理データの移行はない。\
失敗時は変更前のGitコミットと管理データの履歴へ戻す。

## Open Questions

なし。\
具体案の採用はproposal.mdのReadinessに従いレビュー時に確認する。

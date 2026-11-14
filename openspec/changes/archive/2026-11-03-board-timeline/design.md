# Design

## Context

- 提案: [proposal.md](proposal.md)。
- 対象仕様: [spec.md](specs/board-visualization/spec.md)。
- 前提と制約: [技術方針](../../../tech.md)、[構造方針](../../../structure.md)。
- 影響する境界: packages/webview/src/pages/board と widgets。

## Goals / Non-Goals

**Goals:**

- ボードとタイムラインの全受け入れ例を成立させる。\
**Non-Goals:**

- 他の変更の振る舞いをこの変更で実装しない。

## Decisions

### D-01 - 責務とデータ境界

- 対象: REQ-015、REQ-016、REQ-017、REQ-018、NREQ-003。
- 選択: packages/webview/src/pages/board と widgetsに責務を配置する。\
  計算はshared、永続化とVS Code APIはextension、画面はwebviewに置く。
- 理由: [技術方針](../../../tech.md)の依存方向とオフライン要件を守れる。
- 代替案: WebviewがYAMLを直接操作する方式は、VS Code APIと検証境界を分散させるため採用しない。
- 配置と依存: packages/webview/src/pages/board と widgets。\
  通信型はpackages/sharedに置き、境界でZod検証する。
- データと日付: YAMLの更新では対象外のコメントを保持し、日付は日本時間のYYYY-MM-DDとして扱う。\
  該当しない機能では変更しない。

### D-02 - 表示更新と検証

- 対象: REQ-015、REQ-016、REQ-017、REQ-018、NREQ-003。
- 選択: 受け入れ例をID付きテストで先に固定し、保存または状態変更の後に単一の検証済みスナップショットを配信する。
- 理由: ボードとEVENT一覧の不一致を防ぎ、各シナリオを独立して検証できる。
- 代替案: 画面ごとの個別再計算は差分が生じやすいため採用しない。
- 配置と依存: packages/webview/src/pages/board と widgetsのテストとpackages/sharedの純粋関数テストを使う。
- データと日付: 学習中、休日、未見積、期限切れは該当シナリオの入力として固定する。

### D-03 - タイムラインと負荷の描画

- 対象: REQ-015～REQ-018、NREQ-003。
- 選択: 日付列の配列とProject行を共有セレクターで作る。\
  必要ペースはSVGの階段状パスで描き、学習中と実績0pt/日では実績線と赤い超過面を隠す。\
  テーマ色はVS CodeのCSS変数を基準にし、Project色と危険色の表示を分離する。
- 理由: 休日列や同日マーカーを同じ日付座標に揃えられる。
- 代替案: グラフライブラリの追加はサイズと依存を増やすため採用しない。
- 配置と依存: packages/webview/src/pages/boardとwidgetsに描画、packages/sharedに集計セレクターを置く。
- データと日付: 該当する保存形式、休日、学習中、テーマ、オフラインの条件は対象仕様に従う。

## Traceability

| 要件ID | シナリオID | 設計節 | 実装予定箇所 | 検証方法とテスト予定 |
| --- | --- | --- | --- | --- |
| REQ-015 | REQ-015-S01 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/webview/src/pages/board と widgets` | `tests/board-timeline/req-015-s01.test.ts`で「月末」を確認 |
| REQ-016 | REQ-016-S01 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/webview/src/pages/board と widgets` | `tests/board-timeline/req-016-s01.test.ts`で「同日の複数Event」を確認 |
| REQ-016 | REQ-016-S02 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/webview/src/pages/board と widgets` | `tests/board-timeline/req-016-s02.test.ts`で「月表示」を確認 |
| REQ-017 | REQ-017-S01 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/webview/src/pages/board と widgets` | `tests/board-timeline/req-017-s01.test.ts`で「学習中の表示」を確認 |
| REQ-017 | REQ-017-S02 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/webview/src/pages/board と widgets` | `tests/board-timeline/req-017-s02.test.ts`で「負荷の超過」を確認 |
| REQ-018 | REQ-018-S01 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/webview/src/pages/board と widgets` | `tests/board-timeline/req-018-s01.test.ts`で「未完了Taskを選ぶ」を確認 |
| REQ-018 | REQ-018-S02 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/webview/src/pages/board と widgets` | `tests/board-timeline/req-018-s02.test.ts`で「未完了Taskがない」を確認 |
| NREQ-003 | NREQ-003-S01 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/webview/src/pages/board と widgets` | `tests/board-timeline/nreq-003-s01.test.ts`で「ライトテーマ」を確認 |

## Verification Plan

- 正常、境界、異常: Traceabilityの各テストで仕様のGIVEN、WHEN、THENを確認する。\
  自動化しにくいVS Codeの実表示とテーマは手動確認し、結果を台帳へ記録する。
- 非機能要件: 対象NREQのシナリオに記載した環境、データ、指標を使う。\
  該当しない場合は対象外とする。
- 手動確認: VS Code安定版でダーク・ライトテーマとサイドバー・エディタの動作を確認し、スクリーンショットを検証記録に添える。
- 全体検証: `pnpm test`、`pnpm typecheck`、`pnpm check`、`pnpm check:fsd`と`openspec validate board-timeline --strict`を実行し、失敗0件を確認する。

## Risks / Trade-offs

| 対象IDまたは設計節 | リスクや制約 | 対処と検証 |
| --- | --- | --- |
| REQ-015、REQ-016、REQ-017、REQ-018、NREQ-003 | 複数変更の実装順により依存先が未実装となる | データ、計算、拡張、画面の順に適用し、契約テストで確認する |

## Migration Plan

新規機能のため既存管理データの移行はない。\
失敗時は変更前のGitコミットと管理データの履歴へ戻す。

## Open Questions

なし。\
具体案の採用はproposal.mdのReadinessに従いレビュー時に確認する。

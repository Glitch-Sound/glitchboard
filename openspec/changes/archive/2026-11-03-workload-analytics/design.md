# Design

## Context

- 提案: [proposal.md](proposal.md)。
- 対象仕様: [spec.md](specs/workload-analysis/spec.md)。
- 前提と制約: [技術方針](../../../tech.md)、[構造方針](../../../structure.md)。
- 影響する境界: packages/shared/src/calculation。

## Goals / Non-Goals

**Goals:**

- 稼働日・負荷・危険判定の全受け入れ例を成立させる。\
**Non-Goals:**

- 他の変更の振る舞いをこの変更で実装しない。

## Decisions

### D-01 - 責務とデータ境界

- 対象: REQ-006、REQ-007、REQ-008、REQ-009、REQ-010、REQ-011。
- 選択: packages/shared/src/calculationに責務を配置する。\
  計算はshared、永続化とVS Code APIはextension、画面はwebviewに置く。
- 理由: [技術方針](../../../tech.md)の依存方向とオフライン要件を守れる。
- 代替案: WebviewがYAMLを直接操作する方式は、VS Code APIと検証境界を分散させるため採用しない。
- 配置と依存: packages/shared/src/calculation。\
  通信型はpackages/sharedに置き、境界でZod検証する。
- データと日付: YAMLの更新では対象外のコメントを保持し、日付は日本時間のYYYY-MM-DDとして扱う。\
  該当しない機能では変更しない。

### D-02 - 表示更新と検証

- 対象: REQ-006、REQ-007、REQ-008、REQ-009、REQ-010、REQ-011。
- 選択: 受け入れ例をID付きテストで先に固定し、保存または状態変更の後に単一の検証済みスナップショットを配信する。
- 理由: ボードとEVENT一覧の不一致を防ぎ、各シナリオを独立して検証できる。
- 代替案: 画面ごとの個別再計算は差分が生じやすいため採用しない。
- 配置と依存: packages/shared/src/calculationのテストとpackages/sharedの純粋関数テストを使う。
- データと日付: 学習中、休日、未見積、期限切れは該当シナリオの入力として固定する。

### D-03 - 決定的な日付計算

- 対象: REQ-006～REQ-011。
- 選択: Asia/Tokyoの今日と休日設定を計算関数に入力する。\
  実績ペースは10稼働日を固定分母とし、予測は期限とIDで安定ソートして先頭Eventからptを配る。\
  必要ペースは全未完了Eventの配分を日付ごとに足し、表示期間で切り出す。
- 理由: テストで時刻、祝日、Project間の競合を固定できる。
- 代替案: 画面内で現在時刻を直接参照する方式は表示面で結果がずれるため採用しない。
- 配置と依存: packages/shared/src/calculationに純粋関数を置き、extensionが現在日と読込Projectを渡す。
- データと日付: 該当する保存形式、休日、学習中、テーマ、オフラインの条件は対象仕様に従う。

## Traceability

| 要件ID | シナリオID | 設計節 | 実装予定箇所 | 検証方法とテスト予定 |
| --- | --- | --- | --- | --- |
| REQ-006 | REQ-006-S01 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/shared/src/calculation` | `tests/workload-analytics/req-006-s01.test.ts`で「休日設定」を確認 |
| REQ-006 | REQ-006-S02 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/shared/src/calculation` | `tests/workload-analytics/req-006-s02.test.ts`で「祝日を稼働日とする」を確認 |
| REQ-007 | REQ-007-S01 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/shared/src/calculation` | `tests/workload-analytics/req-007-s01.test.ts`で「未見積の完了」を確認 |
| REQ-007 | REQ-007-S02 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/shared/src/calculation` | `tests/workload-analytics/req-007-s02.test.ts`で「学習中の境界」を確認 |
| REQ-007 | REQ-007-S03 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/shared/src/calculation` | `tests/workload-analytics/req-007-s03.test.ts`で「0ptの実績」を確認 |
| REQ-008 | REQ-008-S01 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/shared/src/calculation` | `tests/workload-analytics/req-008-s01.test.ts`で「複数Projectの競合」を確認 |
| REQ-008 | REQ-008-S02 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/shared/src/calculation` | `tests/workload-analytics/req-008-s02.test.ts`で「算出不能」を確認 |
| REQ-009 | REQ-009-S01 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/shared/src/calculation` | `tests/workload-analytics/req-009-s01.test.ts`で「期限が休日」を確認 |
| REQ-009 | REQ-009-S02 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/shared/src/calculation` | `tests/workload-analytics/req-009-s02.test.ts`で「期限切れ」を確認 |
| REQ-010 | REQ-010-S01 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/shared/src/calculation` | `tests/workload-analytics/req-010-s01.test.ts`で「100%超」を確認 |
| REQ-010 | REQ-010-S02 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/shared/src/calculation` | `tests/workload-analytics/req-010-s02.test.ts`で「分母0」を確認 |
| REQ-011 | REQ-011-S01 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/shared/src/calculation` | `tests/workload-analytics/req-011-s01.test.ts`で「期限接近と溢れ」を確認 |
| REQ-011 | REQ-011-S02 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/shared/src/calculation` | `tests/workload-analytics/req-011-s02.test.ts`で「注意のみ」を確認 |
| REQ-011 | REQ-011-S03 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/shared/src/calculation` | `tests/workload-analytics/req-011-s03.test.ts`で「学習中」を確認 |

## Verification Plan

- 正常、境界、異常: Traceabilityの各テストで仕様のGIVEN、WHEN、THENを確認する。\
  自動化しにくいVS Codeの実表示とテーマは手動確認し、結果を台帳へ記録する。
- 非機能要件: 対象NREQのシナリオに記載した環境、データ、指標を使う。\
  該当しない場合は対象外とする。
- 手動確認: VS Code安定版でダーク・ライトテーマとサイドバー・エディタの動作を確認し、スクリーンショットを検証記録に添える。
- 全体検証: `pnpm test`、`pnpm typecheck`、`pnpm check`、`pnpm check:fsd`と`openspec validate workload-analytics --strict`を実行し、失敗0件を確認する。

## Risks / Trade-offs

| 対象IDまたは設計節 | リスクや制約 | 対処と検証 |
| --- | --- | --- |
| REQ-006、REQ-007、REQ-008、REQ-009、REQ-010、REQ-011 | 複数変更の実装順により依存先が未実装となる | データ、計算、拡張、画面の順に適用し、契約テストで確認する |

## Migration Plan

新規機能のため既存管理データの移行はない。\
失敗時は変更前のGitコミットと管理データの履歴へ戻す。

## Open Questions

なし。\
具体案の採用はproposal.mdのReadinessに従いレビュー時に確認する。

# Design

## Context

- 提案: [proposal.md](proposal.md)。
- 対象仕様: [spec.md](specs/item-details/spec.md)。
- 前提と制約: [技術方針](../../../tech.md)、[構造方針](../../../structure.md)。
- 影響する境界: packages/webview/src/widgets/detail-panel。

## Goals / Non-Goals

**Goals:**

- 共通詳細パネルの全受け入れ例を成立させる。\
**Non-Goals:**

- 他の変更の振る舞いをこの変更で実装しない。

## Decisions

### D-01 - 責務とデータ境界

- 対象: REQ-026、REQ-027、REQ-028。
- 選択: packages/webview/src/widgets/detail-panelに責務を配置する。\
  計算はshared、永続化とVS Code APIはextension、画面はwebviewに置く。
- 理由: [技術方針](../../../tech.md)の依存方向とオフライン要件を守れる。
- 代替案: WebviewがYAMLを直接操作する方式は、VS Code APIと検証境界を分散させるため採用しない。
- 配置と依存: packages/webview/src/widgets/detail-panel。\
  通信型はpackages/sharedに置き、境界でZod検証する。
- データと日付: YAMLの更新では対象外のコメントを保持し、日付は日本時間のYYYY-MM-DDとして扱う。\
  該当しない機能では変更しない。

### D-02 - 表示更新と検証

- 対象: REQ-026、REQ-027、REQ-028。
- 選択: 受け入れ例をID付きテストで先に固定し、保存または状態変更の後に単一の検証済みスナップショットを配信する。
- 理由: ボードとEVENT一覧の不一致を防ぎ、各シナリオを独立して検証できる。
- 代替案: 画面ごとの個別再計算は差分が生じやすいため採用しない。
- 配置と依存: packages/webview/src/widgets/detail-panelのテストとpackages/sharedの純粋関数テストを使う。
- データと日付: 学習中、休日、未見積、期限切れは該当シナリオの入力として固定する。

### D-03 - 共通パネルと安全なリンク

- 対象: REQ-026～REQ-028。
- 選択: 選択項目の種別で表示フィールドを切り替える単一Sheetを用いる。\
  `note`はプレーンテキストとして表示し、linksはlabelとtargetの配列に分ける。\
  相対パスは管理リポジトリの正規化後の内側だけを許可し、URLはhttp/httpsだけを開く。
- 理由: 補足からスクリプトやリポジトリ外のファイルへ誘導されるのを防げる。
- 代替案: note内の任意HTMLを描画する方式は安全性と保存形式が複雑になるため採用しない。
- 配置と依存: packages/webview/src/widgets/detail-panelに表示とフォーム、packages/extensionにリンク解決と保存を置く。
- データと日付: 該当する保存形式、休日、学習中、テーマ、オフラインの条件は対象仕様に従う。

## Traceability

| 要件ID | シナリオID | 設計節 | 実装予定箇所 | 検証方法とテスト予定 |
| --- | --- | --- | --- | --- |
| REQ-026 | REQ-026-S01 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/webview/src/widgets/detail-panel` | `tests/detail-panel/req-026-s01.test.ts`で「補足あり」を確認 |
| REQ-026 | REQ-026-S02 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/webview/src/widgets/detail-panel` | `tests/detail-panel/req-026-s02.test.ts`で「補足なし」を確認 |
| REQ-027 | REQ-027-S01 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/webview/src/widgets/detail-panel` | `tests/detail-panel/req-027-s01.test.ts`で「期限変更」を確認 |
| REQ-027 | REQ-027-S02 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/webview/src/widgets/detail-panel` | `tests/detail-panel/req-027-s02.test.ts`で「Project色変更」を確認 |
| REQ-028 | REQ-028-S01 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/webview/src/widgets/detail-panel` | `tests/detail-panel/req-028-s01.test.ts`で「相対リンク」を確認 |
| REQ-028 | REQ-028-S02 | [D-01](#d-01---責務とデータ境界)、[D-02](#d-02---表示更新と検証) | `packages/webview/src/widgets/detail-panel` | `tests/detail-panel/req-028-s02.test.ts`で「危険なリンク」を確認 |

## Verification Plan

- 正常、境界、異常: Traceabilityの各テストで仕様のGIVEN、WHEN、THENを確認する。\
  自動化しにくいVS Codeの実表示とテーマは手動確認し、結果を台帳へ記録する。
- 非機能要件: 対象NREQのシナリオに記載した環境、データ、指標を使う。\
  該当しない場合は対象外とする。
- 手動確認: VS Code安定版でダーク・ライトテーマとサイドバー・エディタの動作を確認し、スクリーンショットを検証記録に添える。
- 全体検証: `pnpm test`、`pnpm typecheck`、`pnpm check`、`pnpm check:fsd`と`openspec validate detail-panel --strict`を実行し、失敗0件を確認する。

## Risks / Trade-offs

| 対象IDまたは設計節 | リスクや制約 | 対処と検証 |
| --- | --- | --- |
| REQ-026、REQ-027、REQ-028 | 複数変更の実装順により依存先が未実装となる | データ、計算、拡張、画面の順に適用し、契約テストで確認する |

## Migration Plan

新規機能のため既存管理データの移行はない。\
失敗時は変更前のGitコミットと管理データの履歴へ戻す。

## Open Questions

なし。\
具体案の採用はproposal.mdのReadinessに従いレビュー時に確認する。

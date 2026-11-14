# 検証報告: resize-board-and-reorder-projects

2026-11-11のapply時に[提案](proposal.md)、[差分仕様](specs/board-visualization/spec.md)、[設計](design.md)、[タスク](tasks.md)と実装を照合した。
実施環境はmacOS arm64、Node 24.18.0、Chromium 156.0.8078.4、VS Code 1.145.2安定版である。

## 検証結果

| 観点 | 結果 |
| --- | --- |
| 完全性 | 10/10タスク、3/3要件を実装と対応付け |
| 正確性 | 3/3要件の実装と16/16シナリオのテストを確認、追加境界でREQ-031の不一致1件 |
| 一貫性 | D-01〜D-04の方式、配置と通信境界を確認、最小高さ補正に警告1件 |

`openspec validate resize-board-and-reorder-projects --strict`が成功した。
ローカルリンク、シナリオID、設計との対応、台帳の実績を確認した。
要件本文は差分仕様を正とし、正式仕様の既存REQ-016-S01〜S04を維持している。

## 要件と実装

| 要件 | 実装 | 確認内容 |
| --- | --- | --- |
| REQ-016 | [Timeline](../../../packages/webview/src/widgets/timeline/ui/Timeline.tsx)、[CSS](../../../packages/webview/src/app/style.css) | 通常行44px、既存のマーカー、詳細操作と3表示期間 |
| REQ-031 | [BoardSplit](../../../packages/webview/src/pages/board/ui/BoardSplit.tsx)、[ボード](../../../packages/webview/src/app/board.tsx) | 比率、境界の操作と取消、下限、初期化とスクロール |
| REQ-032 | [Timeline](../../../packages/webview/src/widgets/timeline/ui/Timeline.tsx)、[共有境界](../../../packages/shared/src/domain/messages.ts)、[セッション](../../../packages/extension/src/session.ts)、[保存](../../../packages/extension/src/storage/manage.ts) | 前後への移動、キー操作、最新データの対象解決、保存とエラー復帰 |

## シナリオの対応

| シナリオ | 自動テストまたは操作手順 | 結果 |
| --- | --- | --- |
| REQ-016-S01 | [同日Event](../../../tests/board-timeline/req-016-s01.test.ts) | 3件の一覧とEvent選択が成功 |
| REQ-016-S02 | [月表示](../../../tests/board-timeline/req-016-s02.test.ts) | 選択Eventだけのラベルと休日表示が成功 |
| REQ-016-S03 | [短期ラベル](../../../tests/board-timeline/regression-labels.test.ts) | 3日と1週間の全マーカー名が成功 |
| REQ-016-S04 | [期限切れ](../../../tests/board-timeline/req-016-s04.test.ts) | 専用列、複数Eventと選択が成功 |
| REQ-016-S05 | [ブラウザー](../../../scripts/verify-board-layout.mjs)、[実機](../../../scripts/verify-board-layout-vscode.mjs) | 両テーマ、3表示期間の44pxと詳細操作が成功 |
| REQ-031-S01 | [ブラウザー](../../../scripts/verify-board-layout.mjs) | 境界を除き468px対312pxで成功 |
| REQ-031-S02 | [ブラウザー](../../../scripts/verify-board-layout.mjs)、[実機](../../../scripts/verify-board-layout-vscode.mjs) | 120pxの移動、選択維持、解放・取消後の不変更が成功 |
| REQ-031-S03 | [ブラウザー](../../../scripts/verify-board-layout.mjs) | 上下両端80px、極小画面では64px対96pxで成功 |
| REQ-031-S04 | [ブラウザー](../../../scripts/verify-board-layout.mjs)、[実機](../../../scripts/verify-board-layout-vscode.mjs) | 上下キー、Home、ダブルクリックが成功 |
| REQ-031-S05 | [ブラウザー](../../../scripts/verify-board-layout.mjs) | 23件のProject、画面サイズ変更、3列の独立スクロールが成功 |
| REQ-032-S01 | [UI](../../../tests/board-timeline/project-reorder.test.tsx)、[ブラウザー](../../../scripts/verify-board-layout.mjs)、[実機](../../../scripts/verify-board-layout-vscode.mjs) | 上半分への挿入と線の終了が成功 |
| REQ-032-S02 | [UI](../../../tests/board-timeline/project-reorder.test.tsx)、[ブラウザー](../../../scripts/verify-board-layout.mjs)、[実機](../../../scripts/verify-board-layout-vscode.mjs) | 下半分への挿入と選択維持が成功 |
| REQ-032-S03 | [保存](../../../tests/data-persistence/project-order.test.ts)、[実機](../../../scripts/verify-board-layout-vscode.mjs) | 再読込、非表示位置、全Projectファイル、設定、フラグ、コメント保持が成功 |
| REQ-032-S04 | [UI](../../../tests/board-timeline/project-reorder.test.tsx)、[保存](../../../tests/data-persistence/project-order.test.ts) | 外部、取消、同一、不正、非表示と消失対象の不変更が成功 |
| REQ-032-S05 | [失敗復帰](../../../tests/board-timeline/project-reorder-error.test.tsx)、[実機](../../../scripts/verify-board-layout-vscode.mjs) | 失敗理由、状態維持、実EACCESと権限復旧後の保存が成功 |
| REQ-032-S06 | [UI](../../../tests/board-timeline/project-reorder.test.tsx)、[ブラウザー](../../../scripts/verify-board-layout.mjs)、[実機](../../../scripts/verify-board-layout-vscode.mjs) | 上下移動と先頭・末尾の不変更が成功 |

## 設計とコードの一貫性

- D-01: ボードページ内のGrid、比率、Pointer Captureとキー操作が一致する。
  高さ比率を画面状態だけに保持している。
- D-02: 通常行のクラスと余白、マーカーのブロック表示が一致する。
  既存の期間、日付、学習中と負荷計算は変更していない。
- D-03: Webviewからの検証済み操作をExtensionが処理し、保存済みスナップショットで表示順を更新する。
  YAMLノードの移動、読込対象の位置だけの並べ替え、一時ファイルからのrenameが一致する。
- D-04: 先行実装と事前手順の欠落を履歴として区別し、追加検証と操作手順を台帳へ記録した。
  要件IDを実装注記とテストへ対応付け、証跡をリポジトリ内へ保存した。

ファイル配置と依存方向はFSD検査で問題がない。
変更による依存パッケージとYAML項目の追加はない。

## 実行結果と証跡

- `npm test`: 83ファイル、152テスト成功。
- `npm run typecheck`、`npm run check`、`npm run check:fsd`: 成功。
- `npm run build`: 成功。
  既存Zod依存の注釈警告が出るが、ビルドは正常終了した。
- `node scripts/verify-board-layout.mjs`: 両テーマの全操作が成功。
- `node scripts/verify-board-layout-vscode.mjs`: 隔離環境で実保存、実書込失敗と復帰、ウィンドウ再読込が成功。
- `git diff --check`: 成功。

[全体検証](../../../artifacts/board-layout/check-results.json)、[ブラウザー結果](../../../artifacts/board-layout/results.json)、[実機結果](../../../artifacts/board-layout/vscode-results.json)、[台帳](../../traceability.md#ボードの高さとproject表示順の改修計画)を参照する。
実機画面は[ダーク](../../../artifacts/board-layout/vscode-dark.png)、[ライト](../../../artifacts/board-layout/vscode-light.png)、[保存失敗](../../../artifacts/board-layout/vscode-save-error.png)にある。

## 再検証での指摘

利用者の`openspec-verify-change`指定を受け、同日にコードと証跡を改めて照合した。
追加の境界確認で、先のapply検証では検出していなかった次の不一致を再現した。
今回の検証では実装とタスクのチェック状態を変更していない。

### WARNING W-01 - 画面縮小時に最小高さを下回る

- 対象: REQ-031の最小高さと画面サイズ変更。
- 箇所: [BoardSplit.tsx:9](../../../packages/webview/src/pages/board/ui/BoardSplit.tsx#L9)と[比率によるGrid配分](../../../packages/webview/src/pages/board/ui/BoardSplit.tsx#L17)。
- 再現: 1440px×900pxで境界を下端までドラッグし、その後1100px×640pxへ画面を縮小する。
- 実測: 縮小前は上部700px、下部80pxである。
  縮小後は上部466.65625px、下部53.328125pxになる。
  境界を除く高さは520pxあり、極小画面向けの40%下限へ切り替える条件には当たらない。
- 原因: `clamp`はドラッグまたは上下キー操作時にだけ呼ばれる。
  画面サイズ変更時にはGridが保存済み比率のまま縮むため、80pxの下限を維持できない。
- 推奨: 画面サイズ変更時にも最小高さを反映し、下限に達する場合は比率の維持より表示余地を優先する。
  その優先関係を仕様と設計へ明記し、下端と上端の両方で、調整後の画面縮小を回帰テストへ追加する。
- 既存テストの不足: [ブラウザー検証](../../../scripts/verify-board-layout.mjs#L136)は3対2の状態で画面を縮小し、縮小後に境界を端へ動かしている。
  最小高さまで調整してから画面を縮小する順序を確認していない。

[再現の数値](../../../artifacts/board-layout/verify-minimum-after-window-resize.json)と[再現画面](../../../artifacts/board-layout/verify-minimum-after-window-resize.png)を保存した。

## 今回の検査範囲と判定

- タスク完了: CLIで10/10を確認した。
- 仕様の実装対応: 追加2要件と変更1要件を確認した。
  廃止と名称変更は対象外である。
- シナリオの対応: 全16シナリオに実装とテストが存在する。
  追加した境界条件でW-01を再現した。
- 設計の整合: D-01〜D-04とコードの配置、通信、YAMLの保存処理を確認した。
- コードの一貫性: FSDの公開入口、既存の操作結果処理、ZodとYAMLの利用方式を確認した。
- 新たに実行: 関連7ファイル・15テストとOpenSpec厳格検証は成功した。
  追加のブラウザー確認ではW-01を再現した。
- 証跡の再利用: 全152テスト、静的検査、ビルドとVS Code実機操作は同じ実装のapply時の実行結果を照合した。
- 未検証または省略した検査: なし。
- CRITICAL: 0件。
- WARNING: 1件。
- SUGGESTION: 0件。

重大な問題は見つからなかったが、最小高さに関する警告が1件ある。
アーカイブは可能であるが、W-01の修正と再検証を推奨する。
正式仕様への同期とアーカイブはこの検証では実施していない。
先行実装より前の計画合意と受け入れテストの失敗確認は、事後に補えない手順上の履歴として保持する。

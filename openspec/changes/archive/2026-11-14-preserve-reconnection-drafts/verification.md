# 検証

## 評価

| 観点 | 結果 |
| --- | --- |
| 完全性 | タスク4/4、変更要件1/1、シナリオ12/12を確認した |
| 正確性 | 正常、取消、失敗と異なる接続の例を検証し、元の YAML だけへの保存を確認した |
| 一貫性 | D-01、D-02、D-03 と実装、共有通信、tech.md の方針が一致する |

CRITICAL、WARNING、SUGGESTION は各0件である。\
省略した適用対象の検証はなく、正式仕様への同期とアーカイブが可能である。\
利用者が行う VS Code 実操作は manual-checks.md へ未確認として残す。

## 実装との対応

- D-01: packages/extension/src/extension.ts の lastSession と configureConnection が同じパスのセッションを再利用する。
- D-02: Extension の requestConnectionChange と設定処理、BoardApp の詳細、Event、Project の順の requestLeave が確定前に入力を解決する。
- D-03: shared/domain/messages.ts、app/operations.ts、BoardApp と EventsApp が接続を要求と表示に含め、Extension が遅れた異接続の操作を拒否する。
- 操作停止: BoardApp の board-interaction と接続完了通知で、確定待ちや別接続欠落中の古い表示への新規入力を防ぐ。
- Project の追加確認は既存 Timeline に必要な範囲だけ追加し、値、YAML、コメントと ID を変更していない。

## シナリオとの対応

| シナリオ | 確認箇所と結果 |
| --- | --- |
| REQ-013-S01 | req-013-s01、snapshot-validation と実監視の既存テストを維持して成功した |
| REQ-013-S02 | req-013-s02 の直前の有効表示保全を維持して成功した |
| REQ-013-S03 | req-013-s03 の無編集時の接続変更を見直し、テストの期待値を変えず成功した |
| REQ-013-S04 | regression-webview の日付変更を維持して成功した |
| REQ-013-S05 | reconnection-drafts の反復再設定で非既定 Event、Story と両下書き、元の Story への1回の保存を確認した |
| REQ-013-S06 | 同テストで詳細と追加の取消、新規ファイル非作成、パネル閉鎖、作成失敗後の操作再開を確認した |
| REQ-013-S07 | 同テストで元の詳細と Story へ保存してから切替し、切替先 YAML の全バイト列が不変であることを確認した |
| REQ-013-S08 | 同テストで Task、詳細、Project の保存失敗、再試行と取消、未保存内容の保持を確認した |
| REQ-013-S09 | 同じ Project 参照と Event UUID が両接続で選択される例で Story 初期選択と詳細解除を確認し、遅延した元接続の操作を拒否した |
| REQ-013-S10 | 設定画面の指定を取り消すと、元のユーザー設定、監視、Event と入力が維持された |
| REQ-013-S11 | Project の名前と色、確認の取消、追加失敗とキーボード操作を確認した |
| REQ-013-S12 | 別接続の欠落では旧表示を操作不可にし、復元後の操作を再開した |

## テストの検出力

再接続の再現15件を修正前の 8ff75f2 へ適用し、14件の失敗を確認した。\
元から成功した1件は、設定解除中の通常保存拒否である。\
操作停止に関する追加2件も対策前の失敗を確認した。\
最終状態で新規19件を含む269テストが成功した。

期待値はリテラル、保存された Task 名の全配列、選択の完全一致、対象外 YAML の全バイト列で比較する。\
同じ Event UUID の場合も Story 選択が初期化されることを確かめ、単に違う Event ID へ移る例だけでは済ませていない。\
キャンセルのテストは未保存内容だけでなく設定値と元ファイルも比較し、保存失敗後の再試行では成功した Task が1件だけであることを確認する。\
共通の通信検証は connection-protocol の2件へ集め、入口では実 Extension と BoardApp の接続を代表の流れで確認する。\
既存テストの期待値を弱めていない。

## 検査結果

- npm run check: lint、型検査、FSD、101ファイルの269テスト、ビルド、7 capability とトレースが成功した。
- 厳格な変更検証と変更単位の厳格トレースは同期前に成功した。
- verify-reconnection-drafts、verify-replacement、verify-project-scope、verify-manage-setup の実ビルド確認が成功した。
- ダークとライトで操作を確認し、ブラウザーの実行エラーは0件だった。
- git diff --check が成功した。

結果とログは artifacts/reconnection-drafts/、変更点と利用者の確認手順は docs/reconnection-drafts-report.md に置く。\
プロダクト検査コマンドは変更していない。\
push、Marketplace 公開、README への画面キャプチャ追加は行っていない。

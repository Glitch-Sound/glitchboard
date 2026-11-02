# NREQ-004 表示更新性能の測定

`prepare.mjs` は5 Project、各20 Event、各10 Story、各3 Task（計3000 Task）の隔離データとVS Codeワークスペースを作成する。
`runner.mjs measure` はボードとEVENT一覧が両方表示された状態で先頭Taskの完了を30回切り替える。
各回でクリックの時刻から、両Webviewが同じ版のスナップショットを受け取り、描画フレームを2回経た時刻までを計測する。
30値を昇順に並べ、29番目をp95として扱う。

## 実行手順

1. `corepack pnpm build` を実行する。
2. `node scripts/performance/prepare.mjs /tmp/glitchboard-performance` を実行する。
3. VS Code安定版を `code --new-window --user-data-dir /tmp/glitchboard-performance/user --extensions-dir /tmp/glitchboard-performance/extensions --extensionDevelopmentPath=$PWD/packages/extension --remote-debugging-port=9222 /tmp/glitchboard-performance/workspace` で起動する。
4. 必要に応じて起動画面を閉じ、ワークスペースを信頼する。
5. `GlitchBoardを開く` コマンドを実行し、ボードで「月」を選び、最初の「Event 1」を選ぶ。
6. Activity BarのGlitchBoardを開き、EVENT一覧も表示する。
7. `node scripts/performance/runner.mjs measure /tmp/glitchboard-performance` を実行する。
8. `/tmp/glitchboard-performance/result.json` の30値、p95、実行環境を確認する。

VS Codeの画面がデバッグポート9222を使っていることを前提とする。実行前に同じポートを使うVS Codeを終了する。
受け入れ条件はApple Silicon Mac、**16GB RAM**、VS Code安定版でp95が500ms以下である。別のメモリ容量での結果は参考値として記録し、合否に使わない。

## 2026-11-03の暫定結果

[24GB実機の測定結果](../../tests/board-timeline/nreq-004-24gb-result.json): Apple M4、24GB RAM、VS Code 1.144.0安定版で30回、p95 238ms、最大239ms。16GB環境での合否は保留。

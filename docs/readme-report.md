# 利用者向け README の整理と検証

## 変更の範囲

README を導入、初期設定、日常操作、指標、保存先の順に整理し、開発情報をルートの DEVELOPMENT.md へ移した。\
製品の動作と正式仕様のシナリオは変更せず、AGENTS.md の文書修正の直接変更として扱った。\
今回の依頼では README への実画面追加が明示的に許可されたため、以前の制限は今回の画像に適用しない。

現行実装の起動と設定判定、選択と詳細、追加先の確認、ポイント、期限、色、進捗計算を照合した。\
Story の自動生成は説明せず、直接 Task の表示名を正確に `Taks` とした。\
旧版データの互換性と移行を提供しないこと、0.2.0 は未公開であることを導入手順の前に示した。

## 参考にした公開情報

2026-11-14 UTC に公開 Marketplace ページと公開リポジトリを読み取った。\
結果は [published-reference.json](../artifacts/readme/published-reference.json) に記録した。

| 対象 | 確認結果 | 利用した説明の観点 |
| --- | --- | --- |
| [GlitchFlow](https://marketplace.visualstudio.com/items?itemName=Glitch-Sound.glitchflow) | 公開版 0.1.3 | 最初に用途を示し、短い導入手順と実例、操作表で説明する構成 |
| [旧 GlitchBoard](https://marketplace.visualstudio.com/items?itemName=Glitch-Sound.glitchboard) | 公開版 0.1.5 | 実画面と基本操作による説明 |
| [glitchboard-ex の Marketplace ID](https://marketplace.visualstudio.com/items?itemName=Glitch-Sound.glitchboard-ex) | HTTP 404 | 別拡張として公開されているとは説明しない |
| [glitchboard-ex の公開ソース](https://github.com/Glitch-Sound/glitchboard-ex) | リポジトリあり | README と manifest を参照し、旧挙動を現行機能へ混ぜない |

[GlitchFlow の公開ソース](https://github.com/Glitch-Sound/glitchflow)も参照した。\
公開ソースの manifest と Marketplace のバージョンは一致していないため、リポジトリの HEAD を公開版と見なしていない。\
文章や古い画像を転載せず、現行実装を根拠に説明と画像を作成した。

## 実画面と可読性

Mac の VS Code 1.146.0 で実際の拡張を動かし、通常のクリックとキーボード操作で画面を表示した。\
Extension との通信や日付、画面要素を架空のものへ差し替えていない。\
撮影用に作った Project、Event、Story、Task だけを使い、利用者の管理データと設定には触れていない。\
一時のユーザーデータと拡張機能フォルダは撮影後に削除する。

| 画像 | 内容 | 元画像の CSS ピクセル |
| --- | --- | --- |
| setup.png | 左の初期設定案内 | 273 x 205 |
| overview.png | 指標、タイムライン、必要ペース、下部の作業一覧 | 964 x 793 |
| tasks.png | Event の要約、Taks、任意 Story、完了行 | 938 x 320 |
| task-points.png | Task 詳細と実際のポイント選択 | 420 x 458 |
| event-add.png | Event 追加と期限カレンダー | 280 x 398 |

すべて Default Dark Modern、倍率0、同じシステムフォント13pxで撮影した。\
デバイス倍率にかかわらず CSS ピクセル単位へ揃え、必要領域だけを切り出し、拡縮や合成はしていない。\
メイン画面は必要ペースと最後の完了行が切れないよう、正規の境界操作で高さを調整した。\
README は画像ごとの縮尺差を避けるため、すべて元画像の85%の幅で表示し、クリックすると原寸の画像を開く。\
最も大きい画像の表示幅は819pxである。

元画像5枚と Chromium で表示した README 内の画像5枚を実際に開き、文字、余白、表示範囲と説明の一致を確認した。\
メイン画面の小さな補助表示は原寸表示でも確認できる構成とした。\
撮影日付は Mac のローカル日付2026-11-15であり、記録の UTC 日付との差は時差による。\
撮影条件は [capture-results.json](../artifacts/readme/capture-results.json)、表示結果は [preview-results.json](../artifacts/readme/preview-results.json) に残した。

## 同期と同梱

ルート README を正本とし、`docs:prepare` が末尾の開発案内を除いて配布用 README を生成する。\
画像パスを配布用へ変換し、サンプル4ファイルも同期する。\
ソースだけにある DEVELOPMENT.md や OpenSpec 文書へのリンクを、配布用 README に残さない。

既存のレイアウト検証が使う `examples/readme-demo` は変更せず、撮影用を `examples/readme-guide` に分けた。\
過去の検証用画像は `.vscodeignore` で配布物から除外した。\
新しい依存関係とプロダクトの機能変更はない。

ビルドの先頭へ `docs:prepare`、全体検査の末尾へ `check:docs` を追加した。\
プロダクト検査の独立した `check:product` は維持した。\
文書検査はローカル参照33件、画像10参照、共通表示倍率、記載した npm スクリプト、README とサンプルの一致を確認する。\
画像欠落、表示倍率の不一致、配布用 README の古さ、存在しないコマンドを与えると失敗することも確認した。

ローカル VSIX は公開せず、最新の再取得画像を含む20ファイルで作成できた。\
ZIP 内の配布用 README と画像が元ファイルに一致し、画像リンク5件、サンプル4ファイルと実行ファイルが存在することを確認した。\
過去の検証用 artifacts は含まれていない。\
最終ビルドの実行ファイルも VSIX 内と一致した。\
結果と SHA-256 は [package-results.json](../artifacts/readme/package-results.json) に記録した。

## 検査と制限

最終状態で `npm run check` を実行し、lint、型検査、FSD、107ファイル298テスト、ビルド、正式仕様7件、トレース、台帳生成、文書検査が成功した。\
結果は [check-results.json](../artifacts/readme/check-results.json)、実行ログは [final-check.log](../artifacts/readme/final-check.log) に残した。\
Chromium で README の画像5枚の読み込み、共通表示倍率と横方向のはみ出しがないことも確認した。\
既存の UI 検査9本は製品コードを変更していないため今回再実行せず、実 VS Code の撮影範囲と README 表示を今回の追加確認とした。

Node.js 24.18.0、pnpm 12.16.1、VS Code 1.146.0で確認した。\
依存関係の再インストール、利用者の OpenSpec グローバル設定の変更とフックの再インストールは行っていない。\
OpenSpec の config set、init と Lefthook の install は help でも構文を照合した。\
Windows、Linux、最低対応版 VS Code 1.105 の実操作は未確認である。\
以前から残る最終操作確認39件は、今回の撮影だけをもって完了にはしていない。

初回作成した VSIX は一時プロファイルへの CLI インストールにも成功した。\
インストール後の VS Code 拡張説明タブの自動表示は検索欄の取得で止まったため、そこでの画像表示は未確認とし、ZIP 内の参照検査と Chromium の README 表示で確認範囲を区別した。\
Marketplace サーバー上の表示も、公開していないため未確認である。

既存状態で LICENSE ファイルがなく、VSIX 作成時に警告が出た。\
ライセンスを勝手に追加せず、公開を伴わないローカル検証用として作成を継続した。\
将来の公開前には、ライセンス、公開先の画像 URL、未公開の注記と導入案内を確認する必要がある。\
GitHub push と Marketplace 公開は行っていない。

## 補足の操作説明の修正

独立レビューを受け、DetailPanel.tsx の補足専用ボタンを再確認した。\
操作表の名前と期限は `編集`、補足は `+ 補足を追加` または `補足を編集` と分け、利用者向け README と配布用 README を同期した。\
製品の動作を変えない文書修正であり、画像の撮り直しはしていない。

修正後に `npm run check`、`check:docs` と Chromium の README 表示を再実行して成功した。\
VSIX も作り直し、修正した README の完全一致、画像5枚とサンプル4ファイル、実行ファイル、manifest の一致と不要な artifacts の除外を確認した。\
今回作り直した VSIX のインストール後の表示確認は再実行せず、同梱検査の結果と SHA-256 を更新した。

## 新しい選択表示での画像更新

後続の選択表示の指定に合わせて、実 VS Code で5枚すべてを再取得した。\
撮影条件と85%の表示幅は維持し、実 VS Code の両テーマの選択とフォーカス、既存の UI 検査9本、README 表示と VSIX 同梱も再検証した。\
その時点の検証範囲と結果は [選択表示の報告](selection-surfaces-report.md) を参照する。

後続の訂正では Event 要約の背景を外し、Story の選択背景を戻して再撮影した。\
現在の表示と検証範囲は [選択背景の役割の訂正](selection-backgrounds-report.md) を参照する。

## 利用者による確認

1. [README](../README.md)を開き、5枚の画像と初期設定、Taks、詳細、ポイントの説明を確認する。
2. 原寸の画像を開いて細部を確認する。
3. [DEVELOPMENT.md](../DEVELOPMENT.md) の手順でローカル VSIX を作り、旧版と分けたプロファイルへ導入する。
4. 新しい管理ファイルを作り、Project、Event、直接 Task と任意 Story を追加して操作表と照合する。
5. 製品全体の最終確認は [manual-checks.md](../openspec/manual-checks.md) を使う。

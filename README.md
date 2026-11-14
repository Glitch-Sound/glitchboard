# GlitchBoard

複数 Project の期限、進捗、作業量を一画面で扱う個人用 VS Code 拡張である。
データは `manage.yaml` と Project ごとの YAML に保存する。

## 使い始める

1. VS Code のアクティビティバーで GlitchBoard を開く。
2. 「manage.yamlを選ぶ」で既存データを選ぶか、「新しく作る」で管理ファイルを作る。
3. サイドバーとメインボードが同時に開く。閉じた場合は「GlitchBoardを開く」でも開ける。
4. タイムラインの Project ＋ で Project を作り、左の EVENT 一覧の ＋ で名前と期限を登録する。
5. 作成した Event が選択されるので、Task ＋ で作業を追加する。

Story の作成は不要である。\
直接追加した作業は「Taks」に表示され、必要なときだけStory の ＋ から通常の Story を追加できる。\
Story 内の Task も同じ完了、ポイントと詳細操作で扱える。

## 日常の操作

| やりたいこと | 操作 |
| --- | --- |
| 期限を見渡す | 3日、1週間、月を切り替える |
| Event の Task を見る | タイムラインの◆、またはサイドバーの Event を選ぶ |
| 直接 Task を追加する | 「Taks」を選び、Task ＋ で名前を入力して Enter |
| 作業をまとめる | Story の ＋ で Story を追加し、その Story を選ぶ |
| 詳細を開く | 各レコードの書類アイコンを押す |
| Story 詳細を開く | Story 行の書類アイコンを押す |
| 完了と解除 | Task のチェックを切り替える |
| ポイントを設定する | Task のポイントバッジを押す |
| 名前、期限、補足を編集する | 詳細パネルの編集を開き、保存する |
| 追加を取り消す | 入力中に Esc、または追加ボタンを再度押す |
| 詳細で取り消す | Esc は最前面を扱い、編集中は保存、破棄、キャンセルを確認する |
| 高さを変える | 上下の境界をドラッグ、または上下キーで調整する |
| 高さを戻す | 境界のダブルクリック、または Home |
| Project を並べ替える | 左端ハンドルのドラッグ、または上下キー |

Event の期限は `YYYY-MM-DD` の直接入力とカレンダーの両方で指定できる。\
カレンダー内の Esc や枠外クリックはカレンダーだけを閉じる。\
保存失敗では名前や補足を残し、画面に理由を示す。\
追加や編集の取消は送信前の入力を捨てる操作であり、すでに送信した保存を巻き戻すものではない。

未見積 Task は計算上 3pt とし、最初の完了から10稼働日までは実績ペースを「学習中」と表示する。\
休日、日本の祝日、読み込む Project は管理ファイルの設定に従う。\
管理ファイルは現在のワークスペースとは別の場所にも置ける。

## 保存モデル

基本は `Project > Event > Task` とし、必要時に `Event > Story > Task` でグループ化する。\
直接 Task は Event の `tasks` に保存し、Story は自動生成しない。\
直接 Task とグループ内 Task の両方を、進捗、残作業、負荷、実績ペースと削除の子件数に含める。\
旧版の管理ファイルの移行と互換性は対象外であり、試用時は新しい管理ファイルを作成する。\
Task を Story 間で移動する UI は今回の対象外である。

## ローカルで動かす

必要なものは Node.js 24、Corepack、VS Code 1.105 以降である。

```sh
corepack pnpm install --frozen-lockfile
npm run check
code --new-window --extensionDevelopmentPath="$PWD/packages/extension" .
```

既存版が有効な場合は、同じ拡張 ID が競合しないよう別の VS Code プロファイルで試す。\
最終操作確認の安全な起動例と確認表は [manual-checks.md](openspec/manual-checks.md) を参照する。

## 開発

指定の [OpenSpec テンプレート](https://github.com/Glitch-Sound/openspec-template) の `ears-bdd` を使う。\
OpenSpec 1.16.0 は開発依存に固定し、pnpm のロックファイルで管理する。\
グローバル設定を初めて行う場合は、次を実行してから初期化する。

```sh
npx --no-install openspec config set profile custom
npx --no-install openspec config set workflows '["explore","ff","apply","update","verify","sync","archive"]'
npx --no-install openspec config set delivery skills
npx --no-install openspec init --tools codex
corepack pnpm exec lefthook install
```

元版の Lefthook を継続し、pre-commit は `npm run check` を実行する。\
テンプレートの既存フック向け手順に従い、core.hooksPath と .githooks は使用しない。\
生成済みの `.agents/skills/` は手で編集しない。\
本作業の生成時は `XDG_CONFIG_HOME` を一時ディレクトリへ指定し、利用者の既存グローバル設定を変更していない。

| コマンド | 内容 |
| --- | --- |
| `npm run check` | プロダクト全体検証、正式仕様の厳格検査、トレース検査、台帳生成 |
| `npm run check:product` | lint、型検査、FSD 検査、全テスト、ビルド |
| `npm run test:ui` | 実ビルドと実保存を接続した両テーマの反復操作検証 |

ブラウザー検証に必要な Chromium がなければ `corepack pnpm exec playwright install chromium` で用意する。\
UI 検証は一時データを作って使い、利用者の管理ファイルを開かない。\
書込権限での失敗を検証するため、管理者権限では実行しない。

- 開発指示: [AGENTS.md](AGENTS.md)
- 目的と範囲: [product.md](openspec/product.md)
- 正式仕様: [仕様一覧](openspec/specs/README.md)
- 自動生成台帳: [traceability.md](openspec/traceability.md)
- 調査、設計根拠、検証と残課題: [リプレース報告](docs/replacement-report.md)


## 管理ファイルの接続

初期設定の管理ファイルはユーザー設定へ保存し、別のワークスペースでも同じボードを利用する。\
管理ファイルと Project ファイルは .yaml と .yml のどちらも外部変更を監視する。\
非読込 Project のファイルが欠落している場合は、その項目を利用不可と表示し、他の正常な Project の表示を継続する。

詳細を開いたまま別レコードを選ぶと、その詳細へ切り替わる。\
編集中は保存、破棄、キャンセルを選び、保存失敗では元の入力が残る。\
タイムライン右上の列幅と行高は全 Project 共通で調整し、再表示でも維持する。\
Home またはダブルクリックで初期寸法に戻せる。\
期限切れ Event は左の EVENT 一覧から操作する。

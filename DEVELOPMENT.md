# 開発手順

この文書はソースからの起動、検査、配布物の作成と OpenSpec の開発手順を扱う。\
利用者向けの初期設定と操作は [README.md](README.md)を参照する。

## 必要な環境と起動

Node.js 24、Corepack、VS Code 1.105 以降を用意する。\
ルートの `package.json` に固定した pnpm を使う。

```sh
corepack pnpm install --frozen-lockfile
npm run check
code --new-window --extensionDevelopmentPath="$PWD/packages/extension" .
```

既存版と拡張 ID が同じため、旧版を有効にした普段のプロファイルと分けて確認する。\
一時プロファイルの起動例と最終確認は [manual-checks.md](openspec/manual-checks.md)を参照する。\
旧版の管理ファイルは移行対象ではなく、新しいデータを使う。

## 検査

| コマンド | 内容 |
| --- | --- |
| `npm run check` | プロダクト検査、正式仕様の厳格検査、トレースと台帳生成、文書検査 |
| `npm run check:product` | lint、型検査、FSD、全テスト、ビルド。OpenSpec を切り離しても実行できる |
| `npm run test:ui` | 実ビルドと実保存を接続した両テーマの反復操作、取消、失敗と再接続、レイアウトの9本 |
| `npm run check:docs` | README のリンク、画像、記載コマンドと配布用 README の同期を検査する |
| `npm run docs:prepare` | ルートの README の利用者向け部分とサンプルを配布用へ同期する |
| `npm run docs:capture` | 隔離した実 VS Code でサンプルを開き、README の画像を撮影する |

ブラウザー検査に必要な Chromium がなければ、次を実行する。

```sh
corepack pnpm exec playwright install chromium
npm run test:ui
```

UI 検査は一時データを作って使い、利用者の管理ファイルを開かない。\
書込権限の失敗も確認するため、管理者権限では実行しない。

## README と画像の更新

ルートの README.md を正とし、開発情報はこの文書へ置く。\
`docs:prepare` は末尾の開発案内を除き、manifest の版に対応する公開タグの HTTPS URL へ画像と原寸リンクを変換し、`packages/extension/README.md` を生成する。\
変更履歴とサンプルデータも配布用へコピーし、配布用 README と CHANGELOG を個別に編集しない。

```sh
npm run build
npm run docs:capture
npm run docs:prepare
npm run check
```

撮影は Mac の実 VS Code と Playwright Electron を使い、既定の実行ファイルは `/Applications/Visual Studio Code.app/Contents/MacOS/Code` である。\
別の場所なら `VSCODE_EXECUTABLE` で指定する。\
一時のユーザーデータと拡張機能フォルダだけを使い、利用者の設定と管理データには触れない。\
Default Dark Modern、倍率0、同じフォント設定で撮影し、CSS ピクセル単位の切り出しだけを行い、画像の拡縮や画面の描き直しはしない。\
README の5枚を保存した後、実 VS Code をライトテーマへ切り替えて選択表示とキーボードフォーカスも検査し、結果を artifacts/selection-backgrounds に残す。\
全体画像は左の EVENT 一覧とメインを同じ実画面から切り出し、アクティビティバー、タイトルバーとステータスバーは除く。\
README 上の指定幅は全画像を元画像の85%へ揃え、本文幅を超える全体画像は幅に収める。\
広い全体画像の文字を細部まで読む場合は、リンクから原寸を開く。\
サンプルの日付は撮影日に合わせて更新し、写真の条件と範囲を `artifacts/readme/capture-results.json` に残す。\
画像そのものと README の表示も開き、文字の可読性、余白と説明との一致を確認する。

## ローカル VSIX の作成

ビルドと文書同期、検査後にパッケージを作る。\
公開と push はこの手順に含まない。

```sh
npm run check
cd packages/extension
npx --no-install vsce ls --no-dependencies
npx --no-install vsce package --no-dependencies --out /tmp/glitchboard-0.2.0.vsix
```

VSIX 内の README、画像、サンプルと実行ファイルを確認し、VS Code の `VSIX からインストール...` で利用できる。\
配布用の画像と原寸リンクは公開タグを参照するため、公開前にタグの画像 URL が取得できることを確認する。\
拡張 ID は旧版と同じ `Glitch-Sound.glitchboard` であり、0.2.0 は既存拡張の更新として配布する。\
0.1.5 のリポジトリと公開 VSIX には LICENSE ファイルと license 指定がなく、0.2.0 でも新しい利用許諾を追加していない。\
同じアイコンを継続し、ライセンス不在の警告を隠すオプションは使わない。

## 0.2.0 の配信

README と CHANGELOG の移行非対応の案内、旧ファイルの保全、VSIX の ID と版、画像、全体検査を先に確認する。\
新リポジトリの main が現在の履歴の祖先であることを確認し、通常の fast-forward で更新する。\
既存のタグを移動せず、履歴を書き換えない。

```sh
git tag -a v0.2.0 -m 'GlitchBoard v0.2.0'
git push --atomic glitchboard main refs/tags/v0.2.0
```

検証した VSIX を Marketplace の既存 `Glitch-Sound.glitchboard` へアップロードする。\
新しい拡張の作成と publisher の変更は行わない。\
サインインと追加の法的同意が必要な場合は利用者が操作し、秘密情報をチャットへ貼らない。\
公開後に Marketplace の版、repository、画像と変更履歴を再取得し、0.2.0 が表示されることを確認する。

## OpenSpec とフック

[開発指示](AGENTS.md)に従い、指定の [OpenSpec テンプレート](https://github.com/Glitch-Sound/openspec-template)の `ears-bdd` を使う。\
OpenSpec 1.16.0 は開発依存に固定し、pnpm のロックファイルで管理する。\
既存の `.agents/skills/` は生成物であり、手で編集しない。

初回のスキル生成が必要な場合は、次を実行する。\
`config set` は利用者のグローバル設定を更新するため、隔離して試す場合は一時ディレクトリを `XDG_CONFIG_HOME` に指定する。

```sh
npx --no-install openspec config set profile custom
npx --no-install openspec config set workflows '["explore","ff","apply","update","verify","sync","archive"]'
npx --no-install openspec config set delivery skills
npx --no-install openspec init --tools codex
corepack pnpm exec lefthook install
```

文書修正などシナリオを変えない作業は直接変更し、振る舞いを変える作業は change を作る。\
change は ff、apply、verify、archive の順とし、sync は archive 内で使う。\
コマンドは常に `npx --no-install openspec` で実行する。

```mermaid
flowchart LR
  A["前提と仕様を確認"] --> B["ff で変更を設計"]
  B --> C["apply で実装とテスト"]
  C --> D["verify で一致を検証"]
  D --> E["archive 内で同期して保管"]
```

元版から継続する Lefthook の pre-commit は `npm run check` を実行する。\
`core.hooksPath` と `.githooks` は使わない。

- [製品の目的と範囲](openspec/product.md)
- [技術方針](openspec/tech.md)と[配置方針](openspec/structure.md)
- [正式仕様の案内](openspec/specs/README.md)
- [要件と実装の台帳](openspec/traceability.md): `npm run check` で生成し、コミットしない
- [調査、設計根拠、検証と残課題](docs/replacement-report.md)
- [README の公開情報調査、実画面撮影と配布物の検証](docs/readme-report.md)

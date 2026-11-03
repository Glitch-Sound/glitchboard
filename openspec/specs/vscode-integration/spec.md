# vscode-integration Specification

## Purpose

VS Code拡張の表示基盤は、個人が複数Projectの作業をVS Codeで管理する際に、どのワークスペースでも同じ管理データへ接続し、サイドバーとエディタで操作できる土台を作る。\
この機能は管理対象の状態と画面の振る舞いを一貫して扱う。

## Requirements

### Requirement: REQ-012 - 二つの表示面

WHEN 拡張を起動したとき、GlitchBoardは SHALL EVENT一覧をVS Codeサイドバーに常設し、コマンドでGlitchBoardをエディタタブに開く。

#### Scenario: REQ-012-S01 - 表示面を開く

- **GIVEN** VS Code安定版で拡張が有効である。
- **WHEN** GlitchBoardを開くコマンドを実行する。
- **THEN** サイドバーのEVENT一覧とエディタタブのボードが表示される。

### Requirement: REQ-013 - 状態同期と外部変更

WHEN YAMLが変更されたとき、GlitchBoardは SHALL 再読込と検証を行い、ボードとEVENT一覧へ同じデータ版を配信する。\
選択項目がなくなった場合は選択を解除する。\
`glitchboard.manageFile`の設定変更時は接続先とファイル監視を切り替え、両画面を再読み込みする。\
日本時間の日付が変わった後は、今日を基準とする計算と表示を更新する。

#### Scenario: REQ-013-S01 - 外部変更

- **GIVEN** 選択中EventのYAMLをエディタ外で削除した。
- **WHEN** ファイル監視が変更を検知する。
- **THEN** 両画面からEventが消え選択状態が解除される。

#### Scenario: REQ-013-S02 - 不正な外部変更

- **GIVEN** 外部編集後のYAMLが不正である。
- **WHEN** 変更を検知する。
- **THEN** 直前の有効な表示を維持しエラーを示す。

#### Scenario: REQ-013-S03 - 管理ファイルの切り替え

- **GIVEN** ボードとEVENT一覧を開いている。
- **WHEN** `glitchboard.manageFile`を別のファイルへ変更する。
- **THEN** VS Codeの再起動なしで新しい管理データを両画面へ反映し、監視対象も切り替わる。

#### Scenario: REQ-013-S04 - 日付変更

- **GIVEN** ボードまたはEVENT一覧を開いたまま日本時間の日付が変わる。
- **WHEN** 画面が現在日を確認する。
- **THEN** 今日の列、期限までの日数、必要ペース、危険判定を新しい日付で更新する。

### Requirement: REQ-014 - 検証済みメッセージ

WHEN Webviewから操作を受けたとき、GlitchBoardは SHALL 共有スキーマでメッセージを検証し、未知または不正な操作を拒否する。
保存や削除の結果を画面へ返し、失敗理由を画面上部に表示する。

#### Scenario: REQ-014-S01 - 不正なポイント

- **GIVEN** Webviewからpoints:4の更新要求が届く。
- **WHEN** Extensionがメッセージを受ける。
- **THEN** 保存せず検証エラーを返す。

#### Scenario: REQ-014-S02 - 操作結果の表示

- **GIVEN** 保存または削除が拡張側で失敗した。
- **WHEN** 失敗理由をWebviewへ返す。
- **THEN** 操作した画面の上部に理由を表示する。

### Requirement: REQ-029 - 管理ファイル未設定時の案内

WHEN `glitchboard.manageFile`が未設定のとき、GlitchBoardは SHALL 空画面の代わりに、既存の`manage.yaml`を選ぶ操作と新しく作る操作を提示する。\
選択または作成後は設定へ保存し、管理データを読み込む。

#### Scenario: REQ-029-S01 - 未設定

- **GIVEN** `glitchboard.manageFile`が未設定である。
- **WHEN** ボードまたはEVENT一覧を開く。
- **THEN** 「manage.yamlを選ぶ」と「新しく作る」を表示する。

### Requirement: NREQ-001 - オフライン動作

WHILE 通信を遮断した環境で利用するとき、GlitchBoardは SHALL ローカルYAMLの読込、表示、編集を外部通信なしで完了する。

#### Scenario: NREQ-001-S01 - ネットワーク遮断

- **GIVEN** ネットワークを無効にし有効な管理データがある。
- **WHEN** ボードを開きTaskを編集する。
- **THEN** 外部要求0件で編集結果がYAMLに保存される。

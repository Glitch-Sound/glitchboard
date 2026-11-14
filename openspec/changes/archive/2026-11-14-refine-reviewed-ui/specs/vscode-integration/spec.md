# 差分仕様

## MODIFIED Requirements

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

#### Scenario: REQ-014-S03 - 左右で読めるエラー

- **GIVEN** メインまたは幅の狭い EVENT 一覧で、長いパスを含む保存または読込の失敗がある。
- **WHEN** 失敗理由を表示する。
- **THEN** 共通の警告アイコンと枠を持つエラー領域に理由を省略せず折り返し、ページ全体を横へはみ出させない。
- **AND** 既存の role=alert と失敗理由の内容を維持し、成功後に古いエラーを消す。

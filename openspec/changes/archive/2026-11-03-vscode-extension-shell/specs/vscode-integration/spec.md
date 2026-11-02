# Spec Delta

## Purpose

VS Code拡張の表示基盤は、個人が複数Projectの作業をVS Codeで管理する際に、どのワークスペースでも同じ管理データへ接続し、サイドバーとエディタで操作できる土台を作る。\
この機能は管理対象の状態と画面の振る舞いを一貫して扱う。

## ADDED Requirements

### Requirement: REQ-012 - 二つの表示面

WHEN 拡張を起動したとき、GlitchBoardは SHALL EVENT一覧をVS Codeサイドバーに常設し、コマンドでGlitchBoardをエディタタブに開く。

#### Scenario: REQ-012-S01 - 表示面を開く

- **GIVEN** VS Code安定版で拡張が有効である。
- **WHEN** GlitchBoardを開くコマンドを実行する。
- **THEN** サイドバーのEVENT一覧とエディタタブのボードが表示される。

### Requirement: REQ-013 - 状態同期と外部変更

WHEN YAMLが変更されたとき、GlitchBoardは SHALL 再読込と検証を行い、ボードとEVENT一覧へ同じデータ版を配信する。\
選択項目がなくなった場合は選択を解除する。

#### Scenario: REQ-013-S01 - 外部変更

- **GIVEN** 選択中EventのYAMLをエディタ外で削除した。
- **WHEN** ファイル監視が変更を検知する。
- **THEN** 両画面からEventが消え選択状態が解除される。

#### Scenario: REQ-013-S02 - 不正な外部変更

- **GIVEN** 外部編集後のYAMLが不正である。
- **WHEN** 変更を検知する。
- **THEN** 直前の有効な表示を維持しエラーを示す。

### Requirement: REQ-014 - 検証済みメッセージ

WHEN Webviewから操作を受けたとき、GlitchBoardは SHALL 共有スキーマでメッセージを検証し、未知または不正な操作を拒否する。

#### Scenario: REQ-014-S01 - 不正なポイント

- **GIVEN** Webviewからpoints:4の更新要求が届く。
- **WHEN** Extensionがメッセージを受ける。
- **THEN** 保存せず検証エラーを返す。

### Requirement: NREQ-001 - オフライン動作

WHILE 通信を遮断した環境で利用するとき、GlitchBoardは SHALL ローカルYAMLの読込、表示、編集を外部通信なしで完了する。

#### Scenario: NREQ-001-S01 - ネットワーク遮断

- **GIVEN** ネットワークを無効にし有効な管理データがある。
- **WHEN** ボードを開きTaskを編集する。
- **THEN** 外部要求0件で編集結果がYAMLに保存される。

# data-management Specification

## Purpose

データモデルと永続化は、個人が複数Projectの作業をVS Codeで管理する際に、管理専用リポジトリのYAMLを安全に読み書きし、期限と作業のデータを管理できるようにする。\
この機能は管理対象の状態と画面の振る舞いを一貫して扱う。

## Requirements

### Requirement: REQ-001 - Task を直接持つ管理モデル

WHILE 管理データを扱う間、GlitchBoard は Project > Event > Task の関係と任意の Event > Story > Task の関係を保持しなければならない(SHALL)。\
Event 直下の tasks と Story 内の tasks は同じ Task 属性、表示、編集、完了と削除の対象とする。\
tasks と stories の省略は空として扱い、全 Task を進捗、残作業、必要ペース、期間負荷、実績ペースと完了予測へ反映する。\
全項目に ID、名前、任意の補足を持ち、Event は期限、Project は色を持つ。

#### Scenario: REQ-001-S01 - 階層を読み込む

- **GIVEN** Project に Event が1件あり、Event 直下と任意 Story 内に Task が各1件ある。
- **WHEN** Projectを読み込む。
- **THEN** 直接 Task と Story 内 Task の両方について親子関係と属性を保持する。

#### Scenario: REQ-001-S02 - 未見積と未完了

- **GIVEN** TaskのpointsとdoneAtが省略されている。
- **WHEN** Taskを読み込む。
- **THEN** 未見積かつ未完了として扱い、集計では3ptを用いる。

### Requirement: REQ-002 - 管理ファイルの配置

WHEN VS Codeのユーザー設定`glitchboard.manageFile`に`manage.yaml`の絶対パスを指定したとき、GlitchBoardは SHALL その親ディレクトリを基準にProjectの相対パスを解決する。\
`manage.yaml`は`settings.workdays_off`の曜日配列、`settings.public_holidays`の真偽値、`projects`の`file`と`load`の配列を持つ。\
Projectファイルは管理モデルの全子孫を含む。

#### Scenario: REQ-002-S01 - 別のワークスペースから開く

- **GIVEN** 設定先にmanage.yamlとprojects/0001_alpha.yamlがある。
- **WHEN** 別フォルダで拡張を開く。
- **THEN** 同じProjectが読み込まれる。

#### Scenario: REQ-002-S02 - 新規Projectファイル

- **GIVEN** 既存番号が0001と0003である。
- **WHEN** Projectを追加する。
- **THEN** 0004_名前.yamlが作られmanage.yamlに相対パスが追加される。

### Requirement: REQ-003 - 読込対象の切り替え

WHEN Projectのloadを変更したとき、GlitchBoardは SHALL manage.yamlへ変更を保存し、loadがtrueのProjectだけを表示、集計、危険判定に使用する。
loadがfalseのProjectも、抽出条件に表示する名前はProjectファイルから読み取る。

#### Scenario: REQ-003-S01 - 読込を外す

- **GIVEN** 2件のProjectが読み込まれている。
- **WHEN** 片方のloadをfalseにする。
- **THEN** そのProjectはボードと全計算から外れ、再起動後も設定が維持される。

#### Scenario: REQ-003-S02 - 読込対象外の名前

- **GIVEN** loadがfalseのProjectファイルに名前「B」が保存されている。
- **WHEN** 抽出条件のProject一覧を作る。
- **THEN** Eventを読み込まず、名前「B」だけを表示用に読み取る。

### Requirement: REQ-004 - YAML検証と保全

IF YAMLが無効、参照先が欠落、またはIDが重複するなら、GlitchBoardは SHALL 対象ファイルを更新せずエラーを表示する。\
正常な保存時は変更箇所以外のコメントを維持する。

#### Scenario: REQ-004-S01 - 無効な日付

- **GIVEN** Eventのdueが存在しない日付である。
- **WHEN** ファイルを読み込む。
- **THEN** ファイル名と対象項目を含むエラーを示し、ファイルを書き換えない。

#### Scenario: REQ-004-S02 - コメント保持

- **GIVEN** 変更対象外のTaskにコメントがある。
- **WHEN** 別Taskを編集して保存する。
- **THEN** 対象外のコメントが残る。

#### Scenario: REQ-004-S03 - 直接とグループで重複する ID

- **GIVEN** Event 直下と Story 内の Task が同じ ID を持つ。
- **WHEN** Project を読み込む。
- **THEN** 重複 ID のエラーを返し、ファイルを変更しない。

### Requirement: REQ-005 - 識別子とファイル名

WHEN 項目を追加するとき、GlitchBoardは SHALL Project番号を既存の最大番号に1を加えた4桁で採番し、0000～9999の範囲を超える場合は追加を拒否する。\
Project、Event、Story、Taskの`id`は同一Projectファイル内の全階層で一意なUUIDとする。\
ファイル名の名前部分はUnicode正規化後にパス区切りとファイル名禁止文字を`-`に置換し、空になれば`project`とする。\
空白も`-`に置換し、連続する`-`は1個へまとめる。\
Project名の変更では既存ファイル名を維持する。

#### Scenario: REQ-005-S01 - 名前の安全な変換

- **GIVEN** Project名が「A/B 計画」である。
- **WHEN** Projectを追加する。
- **THEN** 0001_A-B-計画.yamlのようにパス区切りを含まないファイルが作られる。

#### Scenario: REQ-005-S02 - 名称変更

- **GIVEN** 0001_alpha.yamlのProject名がalphaである。
- **WHEN** 名前をbetaに変更する。
- **THEN** ファイル名とmanage.yamlの参照は維持される。

### Requirement: REQ-038 - 読込時の非変更

WHEN 管理ファイルと Project を読み込むとき、GlitchBoard は読込だけを理由に内容を移行または書き換えてはならない(SHALL)。\
無効な入力はエラーとし、利用者が保存操作を行うまでファイルを変更しない。

#### Scenario: REQ-038-S01 - 読込は保存を伴わない

- **GIVEN** 注釈と未使用の属性を含む有効な Project YAML がある。
- **WHEN** 管理ファイルを繰り返し読み込む。
- **THEN** ファイルのバイト列は変わらず、画面用には現行の属性だけを読む。

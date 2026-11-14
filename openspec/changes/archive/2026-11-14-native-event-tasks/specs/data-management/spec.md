# 差分仕様

## MODIFIED Requirements

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


## ADDED Requirements

### Requirement: REQ-038 - 読込時の非変更

WHEN 管理ファイルと Project を読み込むとき、GlitchBoard は読込だけを理由に内容を移行または書き換えてはならない(SHALL)。\
無効な入力はエラーとし、利用者が保存操作を行うまでファイルを変更しない。

#### Scenario: REQ-038-S01 - 読込は保存を伴わない

- **GIVEN** 注釈と未使用の属性を含む有効な Project YAML がある。
- **WHEN** 管理ファイルを繰り返し読み込む。
- **THEN** ファイルのバイト列は変わらず、画面用には現行の属性だけを読む。

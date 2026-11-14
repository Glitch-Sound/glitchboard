# 差分仕様

## MODIFIED Requirements

### Requirement: REQ-003 - 読込対象の切り替え

WHEN Projectのloadを変更したとき、GlitchBoardは SHALL manage.yamlへ変更を保存し、loadがtrueのProjectだけを表示、集計、危険判定に使用する。
loadがfalseのProjectも、抽出条件に表示する名前はProjectファイルから読み取る。\
IF 非読込ファイルの概要を取得できない場合、THEN ファイル名と利用不可の表示を使い、他の正常な Project の表示を継続しなければならない(SHALL)。

#### Scenario: REQ-003-S01 - 読込を外す

- **GIVEN** 2件のProjectが読み込まれている。
- **WHEN** 片方のloadをfalseにする。
- **THEN** そのProjectはボードと全計算から外れ、再起動後も設定が維持される。

#### Scenario: REQ-003-S02 - 読込対象外の名前

- **GIVEN** loadがfalseのProjectファイルに名前「B」が保存されている。
- **WHEN** 抽出条件のProject一覧を作る。
- **THEN** Eventを読み込まず、名前「B」だけを表示用に読み取る。

#### Scenario: REQ-003-S03 - 非読込ファイルの欠落

- **GIVEN** 読込対象の有効な Project と、load が false の欠落ファイルがある。
- **WHEN** 初めてボードを読み込む。
- **THEN** 有効な Project を表示し、非読込項目はファイル名と利用不可の表示を持つ。

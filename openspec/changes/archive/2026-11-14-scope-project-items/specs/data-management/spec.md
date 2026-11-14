# 差分仕様

## MODIFIED Requirements

### Requirement: REQ-005 - 識別子とファイル名

WHEN 項目を追加するとき、GlitchBoardは SHALL Project番号を既存の最大番号に1を加えた4桁で採番し、0000～9999の範囲を超える場合は追加を拒否する。\
Project、Event、Story、Taskの`id`は同一Projectファイル内の全階層で一意なUUIDとする。\
別 Project の同じ UUID を許容し、登録ファイルと項目 ID で対象を特定する。\
曖昧な要求や、指定したファイルに対象がない要求では変更しない。\
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

#### Scenario: REQ-005-S03 - 別 Project の同一 ID

- **GIVEN** 異なる Project ファイル内で UUID が重複している。
- **WHEN** 2番目の Project の項目を編集、完了変更、追加、削除する。
- **THEN** 指定した Project だけが変わり、1番目のファイルは変わらない。


#### Scenario: REQ-005-S04 - 曖昧または無効な参照

- **GIVEN** 異なる Project ファイル内で UUID が重複している。
- **WHEN** Project を省略して曖昧な操作を送るか、存在しない参照、別 Project の ID を送る。
- **THEN** 要求を拒否し、両ファイルを変更しない。


#### Scenario: REQ-005-S05 - 同一 ID の選択と詳細

- **GIVEN** 異なる Project ファイル内で UUID が重複している。
- **WHEN** 2番目の Event を選んで Task の詳細を開く。
- **THEN** 2番目の項目を表示し、再読込後もその選択を保つ。


#### Scenario: REQ-005-S06 - 同一 ID の計算

- **GIVEN** 異なる Project ファイル内で UUID が重複している。
- **WHEN** 両 Event の予測と危険を計算する。
- **THEN** 各 Project の結果を個別に保持し、片方の結果で上書きしない。


#### Scenario: REQ-005-S07 - Project 自体の同一 ID

- **GIVEN** 異なる Project ファイル内で UUID が重複している。
- **WHEN** 2番目の Project を1番目の前へ動かす。
- **THEN** 指定したファイルの参照だけが移動し、両 Project の内容は変わらない。

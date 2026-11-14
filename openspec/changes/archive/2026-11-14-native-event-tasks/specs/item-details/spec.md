# 差分仕様

## MODIFIED Requirements

### Requirement: REQ-028 - 補足

WHEN 詳細パネルで補足を保存したとき、GlitchBoardは SHALL `note`の文章と箇条書きをProject YAMLに保存する。\
詳細パネルにリンク入力を表示せず、編集要求に `links` があれば拒否する。

#### Scenario: REQ-028-S03 - 補足の保存

- **GIVEN** 補足のないProjectを表示している。
- **WHEN** 文章と箇条書きを補足として保存する。
- **THEN** `note`だけを保存要求に含め、リンク入力を表示しない。


#### Scenario: REQ-028-S05 - 直接 Task の補足を読み戻す

- **GIVEN** Event 直下に Task がある。
- **WHEN** その Task の補足を保存して読み込む。
- **THEN** 補足は直接 Task に保存され、再読込後も同じ内容となる。

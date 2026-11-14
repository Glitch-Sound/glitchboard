# 差分仕様

## MODIFIED Requirements

### Requirement: REQ-012 - 二つの表示面

WHEN 拡張を起動したとき、GlitchBoardは SHALL EVENT一覧をVS Codeサイドバーに常設し、コマンドとサイドバーの表示時にGlitchBoardをエディタタブに開く。\
繰り返し表示してもメインパネルを重複作成しない。

#### Scenario: REQ-012-S01 - 表示面を開く

- **GIVEN** VS Code安定版で拡張が有効である。
- **WHEN** GlitchBoardを開くコマンドを実行する。
- **THEN** サイドバーのEVENT一覧とエディタタブのボードが表示される。

#### Scenario: REQ-012-S02 - メニューから両画面を表示

- **GIVEN** GlitchBoard のサイドバーが閉じている。
- **WHEN** メニューから GlitchBoard を選ぶ。
- **THEN** EVENT 一覧とメインパネルが表示され、再度選んでもパネルは1つである。

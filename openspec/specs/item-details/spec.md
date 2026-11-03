# item-details Specification

## Purpose

共通詳細パネルは、個人が複数Projectの作業をVS Codeで管理する際に、全階層の補足と編集操作を共通の詳細パネルから行えるようにする。\
この機能は管理対象の状態と画面の振る舞いを一貫して扱う。

## Requirements

### Requirement: REQ-026 - 詳細パネルの表示

WHEN どの階層の詳細ボタンを押したときも、GlitchBoardは SHALL 右側のパネルに種別と階層、主要指標3つ、補足、リンク、編集と削除を示す。\
補足があれば詳細ボタンを青、なければ灰色とし、補足なしでは「+ 補足を追加」を示す。\
Taskにはポイント、Projectには色の編集部品を示し、Escまたは×で閉じる。
上部は色付き種別タグ、階層、タイトルの順とし、主要指標は3枚のカードで示す。\
Taskのポイントはスライダーで編集し、「補足」は区切り線付きの見出しとする。下部の編集と削除は間隔を空けた独立ボタンにする。

#### Scenario: REQ-026-S01 - 補足あり

- **GIVEN** noteを持つStoryがある。
- **WHEN** 青い詳細ボタンを押す。
- **THEN** 右側にStoryの詳細が開く。

#### Scenario: REQ-026-S02 - 補足なし

- **GIVEN** noteがないTaskがある。
- **WHEN** 灰色の詳細ボタンを押す。
- **THEN** + 補足を追加が表示される。

### Requirement: REQ-027 - 詳細編集

WHEN 詳細パネルで編集を保存したとき、GlitchBoardは SHALL 名前、Event期限、Project色、Taskポイントを種類に応じて検証し、YAMLに保存して各表示と計算へ反映する。

#### Scenario: REQ-027-S01 - 期限変更

- **GIVEN** Eventの期限が2026-11-10である。
- **WHEN** パネルで2026-11-12へ変更する。
- **THEN** タイムラインの◆と危険判定が更新される。

#### Scenario: REQ-027-S02 - Project色変更

- **GIVEN** 青いProjectがある。
- **WHEN** パネルで緑を選ぶ。
- **THEN** Project色が保存されマーカーも緑になる。

### Requirement: REQ-028 - 補足とリンク

WHEN 詳細パネルで補足を保存したとき、GlitchBoardは SHALL `note`の文章と箇条書き、および`links`配列の`label`と`target`をProject YAMLに保存する。\
リンク先は管理リポジトリ内の相対パスまたはhttp/https URLだけを許可し、相対パスの`..`による管理リポジトリ外への移動を拒否する。

#### Scenario: REQ-028-S01 - 相対リンク

- **GIVEN** noteとlinksにprojects/guide.mdがある。
- **WHEN** リンクを押す。
- **THEN** 管理リポジトリ内の該当ファイルをVS Codeで開く。

#### Scenario: REQ-028-S02 - 危険なリンク

- **GIVEN** linksにjavascript: URLがある。
- **WHEN** パネルを開く。
- **THEN** リンクを無効として開かず診断を示す。

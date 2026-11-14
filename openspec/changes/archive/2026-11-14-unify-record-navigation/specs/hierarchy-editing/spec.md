# 差分仕様

## MODIFIED Requirements

### Requirement: REQ-033 - Story 作成なしの Task 追加

WHEN Event の Task 追加を保存したとき、GlitchBoard は Story の事前作成を要求せず、未見積の Task を Event 直下へ保存しなければならない(SHALL)。\
通常 Story 内の Task と同じ属性と操作を持ち、自動で Story を作ってはならない。\
直接追加と Story 向け追加の保存先を明確に分ける。\
空白の名前、不正な追加先、保存失敗では保存済みデータを変えてはならない。\
Story 一覧の見出しは Story、直接 Task の仮想グループ名は正確に Taks とし、自動 Story は保存しない。

#### Scenario: REQ-033-S01 - 最初の Task

- **GIVEN** Story がない Event がある。
- **WHEN** Event の Task に「調査」を追加する。
- **THEN** 未見積の「調査」1件が保存され、再読込後も Task として表示される。

#### Scenario: REQ-033-S02 - 繰り返し追加と保存先

- **GIVEN** 通常 Story に Task がある。
- **WHEN** Event の Task に2件を続けて追加する。
- **THEN** 通常 Story とその Task はそのままで、Event 直下に新しい Task 2件だけが保存される。

#### Scenario: REQ-033-S03 - 不正な追加と失敗

- **GIVEN** 保存済みの Event がある。
- **WHEN** 下表の追加を試みる。
- **THEN** 保存済みデータは変わらず、理由を返す。

| 条件 |
| --- |
| 空白だけの名前 |
| 存在しない Event |
| 保存先が書き込めない |

#### Scenario: REQ-033-S04 - 未入力と取消

- **GIVEN** 空の Event で Task 追加欄を開いている。
- **WHEN** 空白だけで保存するか Esc で取り消す。
- **THEN** 追加要求は送らず、取消後に再び開くと入力欄は空である。

#### Scenario: REQ-033-S05 - 直接 Task の仮想グループ名

- **GIVEN** Event に直接 Task がある。
- **WHEN** 下部の Story 一覧を表示する。
- **THEN** 見出しは Story、仮想グループは Taks であり、Project YAML に Story は自動生成されない。

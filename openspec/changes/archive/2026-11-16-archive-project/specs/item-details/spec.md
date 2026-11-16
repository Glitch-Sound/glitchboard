# 差分仕様

## ADDED Requirements

### Requirement: REQ-047 - Project のアーカイブ

WHEN Project 詳細の編集でアーカイブを選び保存したとき、GlitchBoard は Project YAML の `archived: true` を保存し、保存成功後だけ PROJECT 一覧からその行と期限マーカーを非表示にしなければならない(SHALL)。\
`archived` は任意の真偽値とし、省略と false は未アーカイブとして扱い、読込だけでは書き換えない。\
再起動後も状態を維持し、再表示と復元の UI は設けない。\
Event、Story、Task、補足、コメント、ID、ファイル参照、読み込み設定を保持し、EVENT 一覧、選択、詳細と読み込み対象の集計を変えない。\
取消と移動確認の破棄では保存せず、キャンセルと保存失敗では編集内容を保持し、失敗理由を表示する。

#### Scenario: REQ-047-S01 - 保存と再起動

- **GIVEN** Project A と B を読み込み、B の詳細を編集している。
- **WHEN** B のアーカイブを選んで保存し、ボードを再起動する。
- **THEN** B の YAML に `archived: true` が残り、PROJECT 一覧と期限マーカーは A だけを表示する。
- **AND** B の関連データと選択中の Event、EVENT 一覧、集計は維持され、A と管理ファイルは変更されない。

#### Scenario: REQ-047-S02 - 未設定と検証

- **GIVEN** Project の `archived` が省略、false、true、文字列 `"true"` のいずれかである。
- **WHEN** Project を読み込む。
- **THEN** 省略と false は未アーカイブ、true はアーカイブとして扱い、文字列は検証エラーとなる。
- **AND** 読み込みだけではファイルを書き換えない。

#### Scenario: REQ-047-S03 - 編集の取消と移動確認

- **GIVEN** Project の編集中にアーカイブを選んでいる。
- **WHEN** 編集を取り消すか別レコードへの移動を試みる。
- **THEN** 取消または移動確認の破棄では保存要求を送らず、再編集では未選択となる。
- **AND** 移動確認のキャンセルでは元の詳細と選択済みのチェックを保持し、保存して進む場合は元の Project をアーカイブしてから移動する。

#### Scenario: REQ-047-S04 - 保存失敗

- **GIVEN** Project の編集中にアーカイブを選んでいる。
- **WHEN** 保存に失敗する。
- **THEN** PROJECT 一覧は変わらず、チェックと名前の入力を保持して失敗理由を表示し、再保存できる。

#### Scenario: REQ-047-S05 - 全件アーカイブと復元 UI の不在

- **GIVEN** 読み込んだ Project がすべてアーカイブ済みである。
- **WHEN** ボードを表示する。
- **THEN** PROJECT 行は0件で、Project の追加とタイムラインの日付、必要ペース、EVENT 一覧からの既存 Event 操作は利用できる。
- **AND** アーカイブ済み詳細には状態だけを示し、再表示と復元を行う操作はない。

# Spec Delta

## Purpose

{{機能が誰のどの目的を支えるか}}

## ADDED Requirements

### Requirement: {{REQ-ID}} - {{機能要件名}}

WHEN {{契機}}、GlitchBoardは SHALL {{観測できる応答}}する。

#### Scenario: {{REQ-ID}}-S01 - {{正常系の例}}

- **GIVEN** {{具体的な初期状態と入力}}。
- **WHEN** {{1つの契機}}。
- **THEN** {{期待する表示、出力、診断などの結果}}。

### Requirement: {{NREQ-ID}} - {{非機能要件名}}

WHILE {{適用状態}}、GlitchBoardは SHALL {{品質上の制約または合格基準}}を満たす。

#### Scenario: {{NREQ-ID}}-S01 - {{品質条件の検証例}}

- **GIVEN** {{環境、データ、測定の前提}}。
- **WHEN** {{操作または検査}}。
- **THEN** {{指標、単位、閾値または明確な判定条件}}を満たす。

## MODIFIED Requirements

### Requirement: {{既存の要件IDと名称を含む見出し全体}}

{{変更後の要件本文}}。

#### Scenario: {{既存シナリオID}} - {{既存シナリオ名}}

- **GIVEN** {{変更後の前提と入力}}。
- **WHEN** {{契機}}。
- **THEN** {{変更後の観測結果}}。

## REMOVED Requirements

### Requirement: {{既存の要件IDと名称を含む見出し全体}}

**Reason**: {{廃止する理由と影響範囲}}

**Migration**: {{代替手段と移行方法、または代替がない理由}}

## RENAMED Requirements

- FROM: `### Requirement: {{既存要件ID}} - {{変更前の名称}}`
- TO: `### Requirement: {{既存要件ID}} - {{変更後の名称}}`

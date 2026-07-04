# MISO SDK Response Shape Fails

## Symptoms

- Direct LLM returns 400.
- Chat stream loses previous answers.
- Tool invocation returns unexpected data.
- Knowledge search data shape differs from assumed code.

## Common Wrong Diagnosis

Constructing raw Service API paths or guessing response fields.

## First Checks

1. Read the relevant SDK source.
2. Read the app/model/tool/dataset spec.
3. Confirm `targetModel` for direct LLM.
4. Confirm streaming history is stored outside current-turn `answer`.

## Commands Or Files To Inspect

- `src/lib/miso-sdk/miso-hooks.ts`
- `src/lib/miso-sdk/miso-llm.ts`
- `.miso/specs/api-integration/*.md`
- Relevant MISO recipe

## Commands Or Files Not To Use

- SDK source edits.
- Raw Service API calls when SDK helper exists.
- Hardcoded provider registration ids.

## Decision Tree

- Direct LLM 400: load config and pass `targetModel`.
- Chat history missing: persist completed turns to `messages[]`.
- Tool fails: verify provider type, provider id, and tool name.
- Knowledge empty: handle empty result separately from error.

## Fix Path

Patch app-owned code to match SDK signatures and response shapes.

## Verification

Confirm loading, data, error, and streaming states in UI.

## Return To Recipe

Return to the relevant MISO integration recipe.

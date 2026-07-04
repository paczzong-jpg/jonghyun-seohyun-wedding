# Kakao Chatbot Skill Server Recipe

## When To Use

Use this when Kakao Open Builder should call a generated MISO website app as a skill server.

## Files

1. Copy `kakao-chatbot-skill.pb.js` to `api/kakao-chatbot-skill.pb.js`.
2. Register this published skill URL in Kakao:

```text
https://<miso-origin>/site/<site_code>/__runtime/api/kakao/chatbot-skill
```

Optionally append a verifier query if you configured `KAKAO_SKILL_VERIFIER`:

```text
https://<miso-origin>/site/<site_code>/__runtime/api/kakao/chatbot-skill?token=<configured-token>
```

## Response Shape

Kakao skill responses must include `version: "2.0"` and a `template.outputs` array. For a simple text response:

```json
{
  "version": "2.0",
  "template": {
    "outputs": [{ "simpleText": { "text": "Hello" } }]
  }
}
```

## Verification

- Kakao test call receives JSON, not HTML.
- Response arrives within 5 seconds.
- If MISO returns `403`, check app IP restriction before editing the route.
- Do not run slow LLM/workflow calls synchronously in this route.

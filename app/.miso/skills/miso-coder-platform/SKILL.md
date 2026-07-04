---
name: miso-coder-platform
description: Use when implementing generated MISO website app features that touch Vite frontend code, boilerplate app overlays, PocketBase data or hooks, MISO SDK integrations, external APIs, Supabase, Neon, files, binary downloads, sandbox commands, or runtime diagnostics.
compatibility: opencode
metadata:
  source: .miso/skills/miso-coder-platform/SKILL.md
---

# MISO Coder Platform

Use this skill to choose the correct implementation surface before editing a generated website app. MISO website apps combine Vite browser code, PocketBase runtime hooks, MISO SDK helpers, managed sandbox rules, and external proxy policies; generic web/backend instincts often pick the wrong surface.

## Feature request router

| User request | Read first | Then read |
| --- | --- | --- |
| Decide where code belongs | `recipes/miso/implementation-surface/README.md` | Relevant reference folder |
| Start from an app boilerplate or template | `boilerplates/README.md` | Matching `boilerplates/{bi-workbench,dashboard-app,admin,project-management,crm,ai-chat,landing,survey,event-app,arcade-game,presentation,notebook,meeting,marketing-studio,newsroom,utility-tool}/README.md` |
| Build a data analysis studio (BI workbench), chart builder, dashboard builder, dashboard, admin console, project management workspace, CRM, AI chat, landing page, survey, event app, arcade game, presentation/slide deck, NotebookLM-style research notebook, meeting note taker (recording/STT/minutes), brand marketing studio, news feed aggregator (keyword RSS collection, AI summaries/Q&A, daily briefing, email newsletter body), or utility tool | `boilerplates/README.md` | Matching boilerplate README, then feature recipes for data/auth/files/LLM |
| Call a public external API from UI | `recipes/miso/external-api/browser/README.md` | `references/vite/env-assets-and-fetch.md` |
| Call an external API with a secret key | `recipes/miso/external-api/pocketbase-hook/README.md` | `recipes/miso/env-secrets/README.md`, `references/pocketbase/jsvm-hooks-and-routes.md` |
| Need API keys, provider credentials, env values, or secrets from the user | `recipes/miso/env-secrets/README.md` | Use `miso_env_vars_request` before coding against missing values |
| Connect a user's Google, Microsoft 365, Notion, or other MISO personal connector account from a website app | Do not implement yet | MISO personal connector OAuth is currently unavailable in the API rollout. Report this limitation; do not use `miso-connectors.ts`, `/__api/auth/connectors/*`, connector grants, connector tokens, or `connectorAuth`. |
| Connect Google Workspace APIs such as Drive, Sheets, Gmail, or Calendar | `recipes/integrations/google/README.md` | Standalone provider OAuth/API only when the user explicitly asks for a non-MISO-connector path. Do not use MISO personal connectors until the API ships. |
| Connect enterprise warehouses such as Snowflake, Databricks SQL, or BigQuery | Provider recipe under `recipes/integrations/{snowflake,databricks,google}/` | `diagnostics/warehouse-or-bi-integration-fails.md`, `recipes/miso/env-secrets/README.md`, and official provider docs linked there |
| Connect BI tools such as Tableau or Power BI | Provider recipe under `recipes/integrations/{tableau,powerbi}/` | `diagnostics/warehouse-or-bi-integration-fails.md`, `recipes/miso/env-secrets/README.md`, and official provider docs linked there |
| Connect OpenDART disclosures, company profile, or financial statements | `recipes/integrations/opendart/README.md` | Matching `recipes/integrations/opendart/filings-and-financials/README.md`, `diagnostics/external-api-auth-cors-or-proxy-fails.md`, and official OpenDART docs linked there |
| Connect Notion pages or data sources | `recipes/integrations/notion/README.md` | Matching `recipes/integrations/notion/{pages,data-sources}/README.md`, `diagnostics/external-api-auth-cors-or-proxy-fails.md`, and official Notion docs linked there |
| Connect Slack messages, webhooks, slash commands, or events | `recipes/integrations/slack/README.md` | Matching `recipes/integrations/slack/{incoming-webhook,bot-message,slash-command,events,verification}/README.md`, `diagnostics/provider-webhook-or-signature-fails.md`, and official Slack docs linked there |
| Connect Kakao Talk Channel, Kakao chatbot skill server, Talk Share webhook, or Kakao Talk Message API | `recipes/integrations/kakao/README.md` | Matching `recipes/integrations/kakao/{chatbot-skill,channel-webhook,talk-share-webhook,callback-verification,message-api}/README.md`, `diagnostics/provider-webhook-or-signature-fails.md`, and official Kakao docs linked there |
| Add Naver Map, Kakao Map, or Leaflet/OpenStreetMap to the website UI | `recipes/integrations/naver/maps/README.md`, `recipes/integrations/kakao/maps/README.md`, or `recipes/integrations/openstreetmap/leaflet/README.md` | `recipes/miso/external-api/browser/README.md`, `references/vite/env-assets-and-fetch.md`, and official map SDK/tile policy docs linked there |
| Connect Dooray Project tasks, comments, or Wiki pages | `recipes/integrations/dooray/README.md` | Matching `recipes/integrations/dooray/{project-posts,wiki-pages}/README.md`, `diagnostics/external-api-auth-cors-or-proxy-fails.md`, and official Dooray docs linked there |
| Receive GitHub webhooks | `recipes/integrations/github/webhook/README.md` | `diagnostics/provider-webhook-or-signature-fails.md` and official GitHub webhook docs linked there |
| Receive Stripe webhook events | `recipes/integrations/stripe/webhook/README.md` | `diagnostics/provider-webhook-or-signature-fails.md` and official Stripe webhook docs linked there |
| Connect Microsoft Teams notifications, outgoing webhooks, or Graph messages | `recipes/integrations/teams/README.md` | Matching `recipes/integrations/teams/{workflows-webhook,outgoing-webhook,graph-message}/README.md`, `diagnostics/provider-webhook-or-signature-fails.md`, and official Microsoft docs linked there |
| Send transactional email with Resend or SendGrid | `recipes/integrations/email/README.md` | Matching `recipes/integrations/email/{resend,sendgrid}/README.md`, `diagnostics/email-delivery-or-domain-fails.md`, and official provider docs linked there |
| Connect Supabase, or add Supabase CRUD/Auth/Realtime/Storage | `recipes/supabase/README.md` | Matching `recipes/supabase/{crud,auth,realtime,files,admin}/README.md` plus official docs linked there |
| Connect Neon, or add Neon Data API/Auth/Management API | `recipes/neon/README.md` | Matching `recipes/neon/{data-api,auth,admin}/README.md` plus official docs linked there |
| Use data.go.kr file data | `recipes/integrations/datagokr/README.md` | `recipes/miso/files/README.md`, `diagnostics/binary-download-or-file-parse-fails.md` |
| Add PocketBase CRUD, schema, auth, files, or realtime | `recipes/pocketbase/README.md` | Matching `recipes/pocketbase/{crud,auth,files,realtime}/README.md` |
| Store app data in PocketBase | `recipes/pocketbase/crud/README.md` | `references/pocketbase/records-schema-and-typegen.md` |
| Use existing MISO login or current MISO user | `recipes/miso/auth/README.md` | `references/miso/platform-auth.md`, `diagnostics/auth-login-or-oauth-fails.md` |
| Add PocketBase app accounts, email/password login, or PocketBase OAuth login | `recipes/pocketbase/auth/README.md` | `references/pocketbase/auth-and-oauth.md`, `diagnostics/auth-login-or-oauth-fails.md` |
| Store files in PocketBase records | `recipes/pocketbase/files/README.md` | `references/pocketbase/files-binary-and-logs.md` |
| Subscribe to PocketBase record changes | `recipes/pocketbase/realtime/README.md` | `references/pocketbase/records-schema-and-typegen.md` |
| Exchange an external identity token for app-local runtime auth | `recipes/integrations/oauth/token-bridge/README.md` | `recipes/miso/env-secrets/README.md`, `diagnostics/auth-login-or-oauth-fails.md` |
| Upload, download, or parse files | `recipes/miso/files/README.md` | `references/pocketbase/files-binary-and-logs.md`, `references/sandbox/uploads-binary-files-and-safe-inspection.md` |
| Import spreadsheet rows | `recipes/pocketbase/imports/spreadsheet/README.md` | `diagnostics/binary-download-or-file-parse-fails.md` |
| Connect a MISO Chatflow app | `recipes/miso/chatflow/README.md` | `references/miso/chatflow.md`, `.miso/specs/api-integration/app-*.md` |
| Connect a MISO Agent app | `recipes/miso/agent/README.md` | `references/miso/agent.md`, `.miso/specs/api-integration/app-*.md` |
| Connect a MISO Workflow app | `recipes/miso/workflow/README.md` | `references/miso/workflow.md`, `.miso/specs/api-integration/app-*.md` |
| Call a MISO-managed LLM directly | `recipes/miso/llm/README.md` | `references/miso/llm.md`, `.miso/specs/api-integration/model-*.md` |
| Give Direct LLM browser/client-side tools it can request | `recipes/miso/llm/README.md` | `references/miso/llm.md`, `src/lib/miso-sdk/miso-llm.ts`; if the client tool wraps a registered platform tool, also read `references/miso/tool.md` and `.miso/specs/api-integration/tool-*.md` |
| Call a workspace Tool directly | `recipes/miso/tool/README.md` | `references/miso/tool.md`, `.miso/specs/api-integration/tool-*.md` |
| Use connected knowledge datasets | `recipes/miso/knowledge-search/README.md` | `references/miso/knowledge-search.md` |
| Browser feature fails | `diagnostics/vite-browser-error.md` | `references/vite/errors-and-verification.md` |
| PocketBase hook or route fails | `diagnostics/pocketbase-hook-not-loading.md` | `diagnostics/pocketbase-route-or-record-write-fails.md` |
| External API auth, CORS, or proxy fails | `diagnostics/external-api-auth-cors-or-proxy-fails.md` | Feature recipe |
| Env secret is undefined or still a placeholder | `diagnostics/env-secret-undefined-or-placeholder.md` | `recipes/miso/env-secrets/README.md` |
| Command or package installation is denied | `diagnostics/dependency-or-command-denied.md` | `references/sandbox/allowed-commands-and-denied-commands.md` |

## Platform rules that override generic advice

- This is a Vite React website app, not Next.js and not a custom Node server.
- Browser code can use public `VITE_*` values; secret external calls move to a PocketBase hook with platform `proxyFetch`.
- Provider integrations belong under `recipes/integrations/<provider>/*`, not under `recipes/auth` or a generic `messaging` folder. Auth recipes are for login/session ownership; provider recipes are for API/webhook surfaces.
- MISO personal connector OAuth is currently unavailable in the API rollout. Generated apps must not use `src/lib/miso-sdk/miso-connectors.ts`, `/__api/auth/connectors/*`, `createMisoConnectorGrant`, `fetchMisoConnectorAccessToken`, or `runtimeProxy.proxyFetch({ connectorAuth })`. If the user needs user-delegated provider access, report the platform limitation first; use standalone provider OAuth/API recipes only when the user explicitly asks for that non-MISO-connector path.
- For warehouse integrations, implement only the provider recipes explicitly listed here. If a requested warehouse needs cloud-provider request signing or a gateway not documented in this skill, report that platform signer/broker support is required instead of hand-rolling request signing in PocketBase.
- If required env values or secrets are missing, call `miso_env_vars_request`. Do not ask the user to paste secret values into chat, do not place real secret values in tool arguments, and do not hand-edit managed env storage.
- All external network access — even just exploring or testing a source — goes through the runtime `proxyFetch`, never a sandbox shell `curl`/`wget`/`fetch`. The sandbox has no CA bundle (direct `https` fails with `error setting certificate file`) and bypasses the SM proxy the app actually uses, so shell results mislead. Use a temporary `_probe` PocketBase route to inspect an external source.
- PocketBase hooks run in Goja/CommonJS. They cannot use npm packages, Node APIs, `import`/`export`, or `async`/`await`.
- PocketBase schema changes go through the sandbox internal runtime API, not browser app code.
- Managed files and folders must not be edited from generated app work.
- Boilerplates are app overlays under `boilerplates/`; copy their app-owned files into the generated app, but do not edit or depend on `.miso/skills` at runtime.
- Binary documents and uploaded files must not be opened with text tools.
- Direct LLM Client Tools and Workspace Tools are different surfaces. Client Tools are per-page/app functions defined with `src/lib/miso-sdk/miso-llm.ts`; Direct LLM only requests them, and browser code executes them. Workspace Tools are platform-registered tools invoked with `useMisoTool(providerType, providerId, toolName, appId?)` using `.miso/specs/api-integration/tool-*.md`.
- Do not pass Workspace Tool provider ids directly as Direct LLM tool manifests and expect the server to execute them. If Direct LLM should decide when to use a Workspace Tool, define a Direct LLM Client Tool whose executor calls the Workspace Tool through the MISO SDK and returns the result to the Direct LLM loop.
- When this skill disagrees with SDK source under `src/lib/miso-sdk/`, the SDK source wins.

## Integrated Platform References

Former standalone platform skill content is folded into this skill. Use the active references and recipes below instead of looking for separate top-level skills:

- `references/miso/chatflow.md`
- `references/miso/agent.md`
- `references/miso/workflow.md`
- `references/miso/llm.md`
- `references/miso/tool.md`
- `references/miso/knowledge-search.md`
- `recipes/miso/implementation-surface/README.md`
- `recipes/miso/env-secrets/README.md`
- `recipes/miso/files/README.md`
- `recipes/miso/chatflow/README.md`
- `recipes/miso/agent/README.md`
- `recipes/miso/workflow/README.md`
- `recipes/miso/llm/README.md`
- `recipes/miso/tool/README.md`
- `recipes/miso/knowledge-search/README.md`
- `boilerplates/README.md`
- `recipes/pocketbase/README.md`
- `recipes/integrations/README.md`
- `recipes/miso/external-api/browser/README.md`
- `recipes/miso/external-api/pocketbase-hook/README.md`
- `references/pocketbase/jsvm-hooks-and-routes.md`
- `references/pocketbase/records-schema-and-typegen.md`
- `references/pocketbase/files-binary-and-logs.md`

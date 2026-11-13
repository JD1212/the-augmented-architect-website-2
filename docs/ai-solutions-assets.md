# AI Solutions content and assets

Only `/ai-solutions` uses the dedicated `src/components/ai-solutions/ai-solutions-page.tsx` and scoped `ai-solutions.module.css`. All public page copy, technology descriptions, concept captions, image metadata and viewer controls are editable in `src/content/ai-solutions.ts`. The shared Salesforce service renderer and its content are unchanged. The older generic AI service content remains for renderer compatibility; the live AI page now reads the dedicated content file.

## Supplied product concepts

The supplied PNGs were renamed without changing their bytes, aspect ratios or colors:

- `ChatGPT Image Nov 13, 2026, 12_42_51 PM-1.png` → `public/images/ai-solutions/agent-operations-overview.png` (1672 × 941; SHA-256 `38f66fde85b9d4e39132cd8fd4634c2e4780dfe194a44ab9488267bad2012c7b`).
- `ChatGPT Image Nov 13, 2026, 12_42_52 PM-2.png` → `public/images/ai-solutions/runtime-integration-control.png` (1672 × 941; SHA-256 `2fb1a1f334bcd09a0a6bbf6b8dd4da600c73fa8ebdcd9f4790eac95479439116`).

Both are labeled illustrative product concepts. Figures, business names, outcomes, connection states and named providers in the artwork are examples, not customer results or a shipped-feature inventory. No additional operating metrics are generated in HTML.

`concept-viewer.tsx` progressively enhances a same-tab link to each original PNG. With JavaScript, it opens a native dialog with fit/actual-size controls, scrolling, keyboard focus wrapping, Escape dismissal and focus restoration. Modified clicks or disabled JavaScript retain the original image link. The enlarged view requests the original PNG without optimization or color filtering. Thumbnails use Next.js image optimization at the original aspect ratio.

## Official technology identity sources

Assets are stored locally and displayed without recoloring, effects or distortion. They identify technologies under evaluation, not partnerships or existing product connectors. Repository license notices accompany applicable assets in `public/images/ai-solutions/technologies/`; trademarks remain with their owners.

| Technology | Asset source | Guidance / license |
| --- | --- | --- |
| LangGraph | https://raw.githubusercontent.com/langchain-ai/langgraph/main/.github/images/logo-light.svg | Official repository MIT license; https://www.langchain.com/brand-assets |
| Hermes Agent | https://raw.githubusercontent.com/NousResearch/hermes-agent/main/assets/icon-master.svg | Official repository app icon; upstream MIT notice included |
| OpenClaw | https://openclaw.ai/brand/openclaw-mascot.svg | Official homepage mascot; upstream project MIT notice included, trademark ownership retained |
| CrewAI | https://raw.githubusercontent.com/crewAIInc/crewAI/main/docs/images/crew_only_logo.png | Official repository logo; upstream MIT notice included |
| n8n | https://guidelines.n8n.design/brand/n8n-symbol.svg | https://guidelines.n8n.design/logo and https://n8n.io/press/ |
| Microsoft Copilot Studio | Product name in editable text; no icon downloaded | https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks requires an express license for product icons; no such license was supplied |

Microsoft's product name is presented in plain site typography, without fabricating a substitute icon or implying endorsement. No runtime packages, providers, connectors or backend services are installed by this page.

## Runtime comparison — refinement pass 1

The comparison's typed data now lives in `src/content/ai-technologies.ts`, referenced by `ai-solutions.ts`. Edit group titles, card summaries, examples, trade-offs, documentation URLs, and all dialog labels there. `technology-comparison.tsx` supplies server-rendered framing; `technology-explorer.tsx` contains reusable cards, previews, and a single native modal dialog. Styles are scoped in `technology-comparison.module.css`. No UI packages or runtime integrations are installed.

Descriptions were checked against the following official documentation on 2026-11-13. The groupings describe typical architectural roles, with overlap. Business examples are hypothetical use cases, not project or integration claims.

- LangGraph: https://docs.langchain.com/oss/python/langgraph/overview
- Hermes Agent: https://hermes-agent.nousresearch.com/docs
- OpenClaw: https://docs.openclaw.ai/
- CrewAI: https://docs.crewai.com/
- OpenAI Agents SDK: https://developers.openai.com/api/docs/guides/agents/define-agents
- Google ADK: https://adk.dev/
- n8n: https://docs.n8n.io/
- Microsoft Copilot Studio: https://learn.microsoft.com/en-us/microsoft-copilot-studio/fundamentals-what-is-copilot-studio

New official assets:

- **Hermes**: `hermes-wing.svg` from the official homepage at https://hermes-agent.nousresearch.com/, asset https://web-assets.nousresearch.com/marketing/571e891702e5224b11af1eb35911ce18f45e7471/assets/hermes-landing/teams/hermes-wing.svg . This replaces the previous app-avatar presentation only within the comparison. Original mark colors are preserved on a dark backing for contrast; the old asset remains available elsewhere.
- **Google ADK**: `google-adk.png` from https://adk.dev/assets/agent-development-kit.png . Source project https://github.com/google/adk-docs ; its Apache 2.0 notice is included as `GOOGLE-ADK-LICENSE.txt`. Google trademark guidance: https://about.google/brand-resource-center/guidance/ . This is the ADK project mark, not a Google partnership lockup.
- **OpenAI**: `openai.svg` from https://raw.githubusercontent.com/openai/openai-agents-python/main/docs/assets/logo.svg . The original white mark is displayed on a dark backing with clear space, without filters or recoloring, solely to identify the SDK. Usage guidance: https://openai.com/brand/ . OpenAI owns its marks; no endorsement is claimed.
- **Microsoft Copilot Studio** continues to use a plain text identity because Microsoft's published guidelines require a license for product icons. No icon permission was supplied; no substitute symbol is fabricated.

All other technology marks retain the sources listed above. Logo containers use `object-fit: contain` and distinguish symbols from wordmarks to preserve proportions and balance visible dimensions.

Local validation:

```sh
npm run lint
node --test tests/*.test.mjs
npm run build
npm run start -- --port 3100
# In a second terminal; requires an installed Chromium browser:
node tests/runtime-comparison.browser.mjs http://localhost:3100
```

Set `CHROME_BIN` to a Chromium executable if autodetection cannot find one. Set `RUNTIME_REVIEW_DIR` to choose where browser screenshots and `results.json` are written (defaults to the operating system's temporary directory). The comparison test checks seven responsive widths, all eight detail dialogs on desktop and mobile, touch activation, keyboard activation, previews, focus wrapping/restoration, reduced motion, asset loading, and existing routes. It does not deploy or contact any AI service.

## Scope boundary for the AI Solutions refinement passes

Future AI Solutions passes must remain within the AI page, its dedicated content, scoped components/styles, and supporting assets/tests. The homepage, Scout, Salesforce, other pages, shared navigation/footer, branding, and global design tokens must remain unchanged unless a user request explicitly authorizes those changes. Check the complete Git diff before reporting completion. Preserve all approved, uncommitted work; do not perform a broad reset or revert.

The approved Vercel deployment is the homepage and Scout visual/behavioral reference. Compare Scout in a fresh focused tab at the same viewport and browser zoom before treating once-per-tab behavior or a mobile breakpoint as a regression. Do not clear or bypass visitors’ stored dismissal choices in application code.

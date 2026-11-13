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

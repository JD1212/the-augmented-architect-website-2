export type Technology = {
  id: string;
  name: string;
  category: string;
  strength: string;
  bestFor: string;
  logo: { src: string; alt: string; shape: 'symbol' | 'wordmark'; dark?: boolean } | null;
  href: string;
  textIdentity?: string;
  details: { overview: string; workloads: string; rationale: string; example: string; considerations: string };
};
export type TechnologyHeadings = Record<keyof Technology['details'], string>;
export type TechnologyGroup = { id: string; title: string; description: string; headings: TechnologyHeadings; items: readonly Technology[] };
const defaultHeadings: TechnologyHeadings = { overview: 'What is it?', workloads: 'What is it best for?', rationale: 'Why would we choose it?', example: 'Real-world example', considerations: 'Considerations' };
const frameworkHeadings: TechnologyHeadings = { overview: 'What is it?', rationale: 'What makes it different?', workloads: 'When should you use it?', example: 'Business example', considerations: 'Considerations' };
const asset = (file: string, alt: string, shape: 'symbol' | 'wordmark' = 'symbol') => ({ src: `/images/ai-solutions/technologies/${file}`, alt, shape });

export const aiTechnologies = {
  eyebrow: 'CHOOSING THE RIGHT RUNTIME',
  title: 'The right technology for the right job.',
  introduction: 'We design the architecture around your business, not around a preferred framework or vendor. Explore the strengths, trade-offs, and practical uses of the tools we can evaluate.',
  distinction: 'These groups describe typical architectural roles, with overlap: visual platforms can run agents and custom code, and code-first frameworks can offer visual tooling. The right choice depends on the process, the team, and the operating environment.',
  bestForLabel: 'Best for',
  detailsLabel: 'Explore technology',
  previewAction: 'Click to view details',
  externalLinkHint: 'opens in a new tab',
  closeLabel: 'Close technology details',
  sourceLabel: 'Official documentation',
  exampleLabel: 'Illustrative business use case',
  headings: defaultHeadings,
  approachTitle: 'Different tools. Different strengths. One architecture designed for your business.',
  approach: 'We combine custom code, agent frameworks, declarative workflows, and managed platforms where they fit. We can design integrations and extensions around these technologies, selecting a foundation your business can maintain and evolve.',
  note: 'Inclusion does not indicate an existing Augmented Enterprises connector, universal native support, a certified partnership, or a guaranteed integration.',
  trademark: 'Product names and marks belong to their respective owners. OpenAI marks are owned by OpenAI. Microsoft and Microsoft Copilot Studio are trademarks of the Microsoft group of companies.',
  groups: [
    { id: 'frameworks', headings: frameworkHeadings, title: 'Agent Frameworks & Runtimes', description: 'Build, orchestrate, and operate agents with control over how work gets done.', items: [
      { id: 'langgraph', name: 'LangGraph', category: "Stateful orchestration framework", strength: 'Explicit control over state and execution in long-running agent workflows.', bestFor: 'Complex, long-running workflows with explicit control over execution, checkpoints, branching, and human approval.', logo: asset('langgraph.svg', 'LangGraph official logo', 'wordmark'), href: 'https://docs.langchain.com/oss/python/langgraph/overview', details: {
        overview: "LangGraph is a framework for building agent workflows as graphs of connected steps. Each node can execute traditional code, call an AI model, interact with a tool, or wait for human input.",
        rationale: "Its strength is explicit control over execution. Developers can manage workflow state, define conditional paths, checkpoint progress, and resume work after interruptions. This makes it especially useful when AI must operate within predictable business processes.",
        workloads: "Choose LangGraph for complex, multi-step processes where reliability, conditional decisions, human approvals, and recoverability matter more than having a completely autonomous assistant.",
        example: "An accounts-payable workflow receives invoices, extracts information using AI, validates amounts against purchase orders, requests approval for exceptions, and continues processing once authorized.",
        considerations: "Offers extensive control, but requires engineering effort to design, maintain, and operate workflows, persistence, and error handling.",
      } },
      { id: 'hermes', name: 'Hermes Agent', category: "Autonomous agent runtime", strength: 'An extensible assistant that uses tools and develops reusable skills across tasks.', bestFor: 'Extensible assistants using skills, tools, and iterative autonomous task execution.', logo: { ...asset('hermes-wing.svg', 'Hermes Agent official wing mark'), dark: true }, href: 'https://hermes-agent.nousresearch.com/docs', details: {
        overview: "Hermes Agent is an autonomous, tool-using agent developed by Nous Research. It can work through tasks, execute tools, maintain context, and use reusable skills across different environments.",
        rationale: "Hermes emphasizes extensibility and learning through reusable skills. Rather than requiring every activity to be mapped into a predefined graph, it can reason through tasks, select tools, and adapt its approach as work progresses. It also supports persistent memory and multiple execution environments.",
        workloads: "Choose Hermes for flexible assistants that perform varied tasks, conduct research, interact with approved systems, and benefit from reusable procedural knowledge.",
        example: "A purchasing assistant reviews approved inventory reports, investigates low-stock items, retrieves supplier information through authorized integrations, and prepares a replenishment recommendation for a manager.",
        considerations: "Autonomous task execution introduces variability. Production deployments need clear tool permissions, execution limits, monitoring, and appropriate approval boundaries.",
      } },
      { id: 'openclaw', name: 'OpenClaw', category: "Persistent agent platform", strength: 'Ongoing assistant experiences across connected tools and messaging channels.', bestFor: 'Long-lived assistants, connected tools, messaging, and ongoing agent experiences.', logo: asset('openclaw.svg', 'OpenClaw official mascot'), href: 'https://docs.openclaw.ai/', details: {
        overview: "OpenClaw provides a persistent AI assistant environment with messaging channels, tools, sessions, skills, and a gateway that connects agent activity across supported interfaces.",
        rationale: "Its strength is the ongoing assistant experience. Instead of treating every task as an isolated API call, OpenClaw provides infrastructure for persistent agents that can receive messages, maintain session context, use tools, and operate through multiple communication channels.",
        workloads: "Choose OpenClaw when a business needs an ongoing assistant that can be reached through messaging or other interfaces and can interact with approved systems over time.",
        example: "An operations assistant receives requests through a team messaging channel, looks up authorized project information, prepares status summaries, and helps coordinate follow-up tasks across the workday.",
        considerations: "Persistent agents need careful controls around identities, messaging-channel permissions, credentials, tool access, and ongoing operational security.",
      } },
      { id: 'crewai', name: 'CrewAI', category: "Multi-agent coordination framework", strength: 'Role-based agents collaborating within structured tasks and workflows.', bestFor: 'Coordinating specialized agents with defined roles and collaborative workflows.', logo: asset('crewai.png', 'CrewAI official logo', 'wordmark'), href: 'https://docs.crewai.com/', details: {
        overview: "CrewAI is a framework for organizing specialized AI agents into collaborative workflows, with defined roles, responsibilities, tasks, and coordination patterns.",
        rationale: "CrewAI emphasizes teamwork between agents. Rather than designing one assistant to perform every task, developers can organize specialists that contribute different skills to a shared objective. Its Flows also support structured workflow orchestration.",
        workloads: "Choose CrewAI when a business process benefits from clearly separated specialist responsibilities and coordinated work between multiple agents.",
        example: "A proposal-development process uses a research agent to gather project requirements, an estimating agent to prepare cost assumptions, and a drafting agent to produce a proposal for human review.",
        considerations: "Multiple agents increase coordination complexity, latency, and potentially token costs. Many tasks are better served by a single agent with well-defined tools.",
      } },
      { id: 'openai-agents', name: 'OpenAI Agents SDK', category: "Code-first agent development SDK", strength: 'Custom applications built with tools, handoffs, guardrails, and a managed agent loop.', bestFor: 'Building custom agent applications with tools, handoffs, guardrails, and orchestration through code.', logo: { ...asset('openai.svg', 'OpenAI official logo identifying the Agents SDK'), dark: true }, href: 'https://developers.openai.com/api/docs/guides/agents/define-agents', details: {
        overview: "The OpenAI Agents SDK provides developer-focused building blocks for creating agents with instructions, tools, sessions, handoffs, guardrails, and tracing.",
        rationale: "It provides a relatively lightweight way to build custom agent applications while retaining programmatic control over business logic. Agents can call functions, delegate to specialists, apply validation, and generate execution traces for debugging and observation.",
        workloads: "Choose the OpenAI Agents SDK when building custom applications that need agents deeply integrated with application code, business APIs, user experiences, or specialized tools.",
        example: "An AI website assistant answers questions about a company's services, retrieves approved information, helps identify customer needs, and transfers qualified inquiries to a consultation-booking workflow.",
        considerations: "The SDK simplifies agent implementation but does not replace application-level authorization, data governance, infrastructure, or business-specific integration design.",
      } },
      { id: 'google-adk', name: 'Google Agent Development Kit (ADK)', category: "Modular agent development framework", strength: 'Modular agents and multi-agent composition with flexible deployment options.', bestFor: 'Developing modular agents, composing multi-agent systems, and integrating with Google-compatible infrastructure.', logo: asset('google-adk.png', 'Google Agent Development Kit official logo'), href: 'https://adk.dev/', details: {
        overview: "Google ADK is a code-first framework for building agent applications with tools, sessions, structured workflows, and multi-agent composition.",
        rationale: "ADK provides patterns for combining language-model agents with structured workflow agents, including sequential, parallel, and loop-based execution. It also provides development and integration options within Google's broader cloud and AI ecosystem.",
        workloads: "Choose Google ADK when developing modular agent applications, particularly when Google Cloud infrastructure, Google services, or structured multi-agent workflows are relevant to the business.",
        example: "A support operations system classifies incoming requests, retrieves information from approved knowledge sources, delegates specialized analysis where needed, and produces a response or escalation recommendation.",
        considerations: "Developers still need to design deployment infrastructure, session storage, authorization, observability, and the boundaries between agent components. Google ADK is not limited exclusively to Google models or infrastructure.",
      } },
    ] },
    { id: 'visual-managed', headings: defaultHeadings, title: 'Visual & Managed Automation Platforms', description: 'Connect processes through visual workflows or managed enterprise environments.', items: [
      { id: 'n8n', name: 'n8n', category: 'Visual workflow automation', strength: 'Event-driven application integration with visual workflows and optional custom code.', bestFor: 'Rapid application integration, event-driven workflows, and operational automation using a visual builder with optional custom code.', logo: asset('n8n.svg', 'n8n official symbol'), href: 'https://docs.n8n.io/', details: {
        overview: 'A workflow automation platform that connects applications through a visual builder, with code steps and AI capabilities.',
        workloads: 'Operational processes driven by schedules, webhooks, application events, and data transformation.',
        rationale: 'Visible workflow steps help teams understand and maintain integrations, while custom code can handle specialized transformations.',
        example: 'A new CRM inquiry triggers data validation, an account lookup, and a task for the appropriate salesperson, with failures routed for review.',
        considerations: 'Credential management, retries, execution volume, and workflow ownership need planning. Self-hosting adds operational work, and licensing depends on the intended use.',
      } },
      { id: 'copilot-studio', name: 'Microsoft Copilot Studio', category: 'Managed enterprise agent platform', strength: 'Declarative business agents within Microsoft’s managed enterprise ecosystem.', bestFor: 'Declarative agents, Microsoft 365/Power Platform integration, and enterprise business experiences.', logo: null, textIdentity: 'Microsoft', href: 'https://learn.microsoft.com/en-us/microsoft-copilot-studio/fundamentals-what-is-copilot-studio', details: {
        overview: 'Microsoft’s managed platform for building agents using natural language and graphical tools, with connectors and enterprise administration.',
        workloads: 'Employee and customer experiences that fit Microsoft 365, Power Platform, and an organization’s managed environment.',
        rationale: 'Existing identity, administration, and connector investments can make a declarative approach easier for business teams to operate.',
        example: 'An employee-support agent answers approved policy questions and starts a leave-request process through authorized business connections.',
        considerations: 'Licensing, capacity, tenant policies, connector access, and platform limits affect the design. Highly specialized execution or portability requirements may favor custom software.',
      } },
    ] },
  ] satisfies readonly TechnologyGroup[],
};

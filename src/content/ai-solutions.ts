import { aiTechnologies } from './ai-technologies';
import type { IconName } from './site';

export type AiConcept = {
  id: string; number: string; title: string; description: string;
  points: readonly string[]; explanation?: string; notice: string;
  image: { src: string; alt: string; width: number; height: number };
};
type Capability = { title: string; description: string; icon: IconName };
type AiSolutionsContent = {
  seo: { title: string; description: string };
  hero: { eyebrow: string; title: string; description: string; capabilitiesLabel: string; topics: readonly string[] };
  problems: { eyebrow: string; title: string; items: readonly { title: string; description: string }[] };
  capabilities: { eyebrow: string; title: string; description: string; items: readonly Capability[] };
  technology: typeof aiTechnologies;
  enterprise: { eyebrow: string; name: string; monogram: string; title: string; description: string; brands: readonly { name: string; role: string }[]; conceptLabel: string; concepts: readonly AiConcept[] };
  viewer: { openLabel: string; hint: string; closeLabel: string; fitLabel: string; actualSizeLabel: string; scrollHint: string };
  development: { eyebrow: string; title: string; description: string; items: readonly string[] };
  philosophy: { eyebrow: string; title: string; description: string; link: { label: string; href: string } };
  consultation: { eyebrow: string; title: string; description: string };
};

export const aiSolutions: AiSolutionsContent = {
  seo: { title: 'AI Architecture & Connected Business Systems', description: 'Technology-independent AI consulting, agent architecture, secure integrations, and custom software. Explore the developing Augmented Enterprises platform.' },
  hero: {
    eyebrow: 'AI SOLUTIONS & CONNECTED SYSTEMS', title: 'Intelligence works better with architecture.',
    description: 'AI is changing faster than any single platform can keep up with. We help businesses design the connected, modular foundations needed to integrate intelligent agents, automate real processes, and evolve as technology changes.',
    capabilitiesLabel: 'Explore Our Capabilities', topics: ['AI architecture', 'Connected business systems', 'Governed agent execution'],
  },
  problems: {
    eyebrow: 'THE PROBLEM WITH DISCONNECTED AI', title: "AI doesn't operate in isolation. Neither should your business.",
    items: [
      { title: 'Disconnected systems', description: 'Business data, knowledge, and workflows are spread across applications, making it difficult for intelligent systems to operate with reliable context.' },
      { title: 'Uncoordinated automation', description: 'Independent workflows and agents accumulate without clear ownership, shared information, or consistent operational boundaries.' },
      { title: 'Uncontrolled access', description: 'Agents need the right information and permissions, with appropriate oversight and security across business applications.' },
    ],
  },
  capabilities: {
    eyebrow: 'CONSULTING · ARCHITECTURE · IMPLEMENTATION', title: 'What we build.',
    description: 'We help shape the system and implement it—from technology selection and business processes to the integrations, software, and operational boundaries that make AI useful.',
    items: [
      { title: 'AI Architecture & Strategy', description: 'Evaluate your business processes, systems, and goals. Determine where AI can create value and design an architecture that supports growth.', icon: 'layers' },
      { title: 'Connected Business Systems', description: 'Build and maintain integrations between applications, databases, APIs, and intelligent agents.', icon: 'data' },
      { title: 'Agent Development & Orchestration', description: 'Develop specialized agents and long-running workflows using the appropriate runtime and orchestration framework.', icon: 'bolt' },
      { title: 'Governance & Secure Access', description: 'Design scoped permissions, credential isolation, access packages, and appropriate human oversight.', icon: 'cloud' },
      { title: 'Custom Software & Automation', description: 'Build custom interfaces, integrations, and workflows using code or declarative tools where they make sense.', icon: 'code' },
      { title: 'Operational Visibility', description: 'Help businesses understand agent execution, utilization, costs, and measurable outcomes.', icon: 'chart' },
    ],
  },
  technology: aiTechnologies,
  enterprise: {
    eyebrow: 'OUR SOFTWARE PLATFORM · IN DEVELOPMENT', name: 'Augmented Enterprises', monogram: 'AE',
    title: 'One business. Many agents. One connected foundation.',
    description: 'Augmented Enterprises is our business AI platform in development. Its direction is a shared foundation for organizing agents, runtime environments, integrations, and controlled access across an organization.',
    brands: [{ name: 'The Augmented Architect', role: 'Consulting & architecture services' }, { name: 'Augmented Enterprises', role: 'Software platform · in development' }],
    conceptLabel: 'ILLUSTRATIVE PRODUCT CONCEPT',
    concepts: [
      {
        id: 'agent-operations', number: '01', title: 'Agent Operations Overview',
        description: 'A proposed analytics experience for understanding how agents operate across a business—not just whether an individual task ran.',
        points: ['Agent inventory', 'Execution history', 'Runtime usage', 'Token and operating costs', 'Usage comparisons', 'Business outcomes and value tracking'],
        notice: 'Illustrative product concept. All figures, outcomes, and business names in this image are example data, not verified customer results. This is a proposed analytics experience, not completed reporting functionality.',
        image: { src: '/images/ai-solutions/agent-operations-overview.png', alt: 'Illustrative Augmented Enterprises Agent Operations Overview concept with example agent inventory, execution charts, runtime costs, and business-value tracking. The figures are not live results.', width: 1672, height: 941 },
      },
      {
        id: 'runtime-integration', number: '02', title: 'Runtime & Integration Control',
        description: 'An architectural direction for connecting multiple execution providers to a business workspace with explicit resource ownership and governed access.',
        points: ['Multiple runtime providers', 'Business Workspaces', 'Reusable integration drivers', 'Business-owned integrations', 'Scoped agent access', 'Governed access packages', 'Centralized permissions and auditing'],
        explanation: 'An integration driver defines the operations a system supports. Each business controls its own connections and determines which agents are authorized to use them, within scoped access packages and permission boundaries.',
        notice: 'Illustrative product concept, not a production screenshot. Named runtimes, applications, connection states, and figures are examples; they do not confirm shipped integrations or completed platform features.',
        image: { src: '/images/ai-solutions/runtime-integration-control.png', alt: 'Illustrative Augmented Enterprises Runtime and Integration Control concept showing runtime providers, a business workspace, integration drivers, and governed access packages. Connections and metrics are examples.', width: 1672, height: 941 },
      },
    ],
  },
  viewer: { openLabel: 'Enlarge product concept', hint: 'Enlarge to inspect the concept', closeLabel: 'Close enlarged concept', fitLabel: 'Fit to window', actualSizeLabel: 'Actual size', scrollHint: 'Use Actual size, then scroll to inspect the full-resolution illustration.' },
  development: {
    eyebrow: 'CUSTOM DEVELOPMENT & INTEGRATION', title: 'The architecture is only the beginning.',
    description: 'We can implement the pieces your business needs, adapting modular solutions to the applications, data, and technology you already use.',
    items: ['Business application integrations', 'API and MCP tool development', 'Custom agent capabilities', 'Long-running workflow orchestration', 'Website assistants and customer experiences', 'Business dashboards and operational reporting', 'Agent access controls and governance', 'Custom applications and internal software'],
  },
  philosophy: {
    eyebrow: 'OUR PHILOSOPHY', title: 'Build for change, not for a particular technology.',
    description: 'As code generation and automation tools improve, architecture matters more: clear boundaries, maintainability, and a deliberate integration strategy keep a business adaptable. We use both code and declarative tools, choosing the approach that serves the business need.',
    link: { label: 'Explore our philosophy', href: '/insights/philosophy' },
  },
  consultation: {
    eyebrow: 'A FOUNDATION THAT CAN EVOLVE', title: "Let's design what comes next.",
    description: "Whether you're exploring AI for the first time or connecting an existing collection of applications and agents, we'll help you find the right architecture and build a foundation that can evolve.",
  },
};

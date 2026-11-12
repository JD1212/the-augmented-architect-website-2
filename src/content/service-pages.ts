import type { IconName } from './site';
export type ServiceSlug = 'ai-solutions' | 'salesforce';
type ServicePageContent = {
  eyebrow: string; title: string; description: string; secondaryLabel: string;
  diagram: 'agents' | 'salesforce'; topics: readonly string[];
  problems: { eyebrow: string; title: string; description: string; items: readonly { title: string; description: string }[] };
  capabilities: { eyebrow: string; title: string; description: string; items: readonly { title: string; description: string; icon: IconName }[] };
  architecture: { eyebrow: string; title: string; description: string; points: readonly string[] };
  approach: { eyebrow: string; title: string; description: string; steps: readonly { title: string; description: string }[] };
};
export const servicePages: Record<ServiceSlug, ServicePageContent> = {
  'ai-solutions': {
    eyebrow: 'AI SOLUTIONS & CONNECTED SYSTEMS', title: 'Intelligence works better with architecture.',
    description: 'Build the foundation for AI-ready growth with integrations, workflows, and a unified customer context. We connect the systems you have with the intelligence your business needs.',
    secondaryLabel: 'Explore our capabilities', diagram: 'agents', topics: ['AI agents', 'Business integrations', 'Modular architecture'],
    problems: {
      eyebrow: 'THE PROBLEMS WE SOLVE', title: 'Disconnected systems limit what AI can do.',
      description: 'An isolated automation can solve a task. A connected architecture supports the process around it.',
      items: [
        { title: 'Context trapped in silos', description: 'Customer information and business knowledge are scattered across applications, making reliable decisions difficult.' },
        { title: 'Automation without an architecture', description: 'Individual workflows accumulate without shared boundaries, ownership, or a clear path to maintain them.' },
        { title: 'Unclear control and oversight', description: 'Agents need defined permissions, human review where it matters, and a clear role within the business process.' },
      ],
    },
    capabilities: {
      eyebrow: 'WHAT WE CAN BUILD TOGETHER', title: 'The right pieces. Connected with purpose.',
      description: 'Technology-independent consulting, from the shape of the system to the implementation details.',
      items: [
        { title: 'AI agent architecture', description: 'Design agents around specific processes, shared context, scoped tools, and appropriate human oversight.', icon: 'layers' },
        { title: 'Business integrations', description: 'Connect applications and data sources with explicit contracts, clear ownership, and maintainable interfaces.', icon: 'data' },
        { title: 'Workflow automation', description: 'Implement practical workflows with custom software, n8n, or Microsoft Copilot Studio where they fit the need.', icon: 'bolt' },
        { title: 'Custom software & AI runtimes', description: 'Build the application and runtime boundaries needed to support your business without forcing a single platform.', icon: 'code' },
      ],
    },
    architecture: {
      eyebrow: 'THE ARCHITECTURE MATTERS', title: 'Shared context. Clear boundaries. Room to evolve.',
      description: 'We treat AI as part of the business system. Data, permissions, integrations, and human decisions need to work together before an agent can be useful.',
      points: ['Start with a real business process', 'Keep context and access explicit', 'Design for oversight and maintainability'],
    },
    approach: {
      eyebrow: 'HOW WE APPROACH THE WORK', title: 'From business problem to maintainable system.',
      description: 'A deliberate path to choose the right scope, validate the architecture, and leave a foundation the business can work with.',
      steps: [
        { title: 'Understand', description: 'Map the process, the systems involved, the users, and the constraints that matter.' },
        { title: 'Architect', description: 'Define responsibilities, context, integration boundaries, and the role of AI.' },
        { title: 'Implement', description: 'Build in useful increments, with explicit checks around data, access, and failure paths.' },
        { title: 'Make it maintainable', description: 'Document the decisions and ownership so the system can be supported and extended.' },
      ],
    },
  },
  salesforce: {
    eyebrow: 'SALESFORCE ARCHITECTURE & MODERNIZATION', title: 'Make Salesforce a stronger foundation.',
    description: "Clean up messy orgs, simplify flows and triggers, and prepare Salesforce for AI and what's next. Bring the platform back into alignment with the way your business works.",
    secondaryLabel: 'Explore our capabilities', diagram: 'salesforce', topics: ['Architecture', 'Modernization', 'Custom development'],
    problems: {
      eyebrow: 'THE PROBLEMS WE SOLVE', title: 'Your org should enable the business, not slow it down.',
      description: 'As Salesforce grows, overlapping decisions and accumulated complexity can make even small changes difficult.',
      items: [
        { title: 'Automation that is hard to untangle', description: 'Overlapping flows and triggers make behavior difficult to predict, explain, and change safely.' },
        { title: 'A fragmented customer picture', description: 'Disconnected applications and inconsistent data make it harder for teams to work from shared context.' },
        { title: 'A foundation that resists change', description: 'Customizations and unclear ownership can limit modernization, integrations, and future AI adoption.' },
      ],
    },
    capabilities: {
      eyebrow: 'WHAT WE CAN BUILD TOGETHER', title: 'Modernize the foundation. Improve the experience.',
      description: 'Architecture and implementation that connect Salesforce to the broader business.',
      items: [
        { title: 'Org architecture & modernization', description: 'Review the data model, responsibilities, and accumulated complexity to define a practical path forward.', icon: 'cloud' },
        { title: 'Flows, triggers & Apex', description: 'Simplify automation boundaries and implement custom behavior where it is appropriate and maintainable.', icon: 'code' },
        { title: 'Custom development', description: 'Build focused Salesforce experiences and application logic around real business requirements.', icon: 'layers' },
        { title: 'Integrations & AI readiness', description: 'Connect systems, clarify data ownership, and prepare reliable context for future intelligent workflows.', icon: 'data' },
      ],
    },
    architecture: {
      eyebrow: 'A COHERENT SALESFORCE ARCHITECTURE', title: 'A maintainable core. A connected business.',
      description: 'Salesforce is part of a wider technology landscape. We design the data model, automation, and integration boundaries together so the platform can evolve with the business.',
      points: ['Clarify data ownership and quality', 'Give automation clear responsibilities', 'Connect the org to the broader architecture'],
    },
    approach: {
      eyebrow: 'HOW WE APPROACH THE WORK', title: 'Understand the org. Make change deliberate.',
      description: 'Modernization starts with understanding what is already there and why the business depends on it.',
      steps: [
        { title: 'Assess', description: 'Map the business process, data model, automation, integrations, and current points of friction.' },
        { title: 'Simplify', description: 'Define the target architecture and a focused sequence of changes with clear ownership.' },
        { title: 'Implement', description: 'Refactor or build in controlled increments, checking the business behavior along the way.' },
        { title: 'Support change', description: 'Leave clear decisions, documentation, and a structure that can be maintained and extended.' },
      ],
    },
  },
};

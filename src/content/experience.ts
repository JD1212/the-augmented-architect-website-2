import type { IconName } from './site';

export type DiagramSpec = {
  label: string;
  note: string;
  center: { title: string; description: string; icon: IconName };
  inputs: readonly { label: string; icon: IconName }[];
  outputs: readonly { label: string; icon: IconName }[];
  foundation: readonly string[];
};
type PreviewNavigation = { label: string; icon: IconName };
export type ProductShowcaseContent = {
  eyebrow: string; brand: string; link: { label: string; href: string }; notice: string;
  strategy: {
    id: string; label: string; title: string; subtitle: string; navigationLabel: string;
    navigation: PreviewNavigation[];
    stats: { label: string; value: string }[];
    activityTitle: string; activity: { title: string; status: string }[];
  };
  workspace: {
    id: string; label: string; title: string; subtitle: string; navigationLabel: string;
    navigation: PreviewNavigation[]; businessLabel: string; businessName: string;
    callout: { eyebrow: string; title: string; description: string; link: { label: string; href: string } };
    readiness: { label: string; value: string }[];
  };
};

export const diagrams: Record<'business' | 'agents' | 'salesforce', DiagramSpec> = {
  business: {
    label: 'Connected business architecture', note: 'Conceptual architecture',
    center: { title: 'Shared context', description: 'A connected foundation', icon: 'layers' },
    inputs: [{ label: 'Business processes', icon: 'chart' }, { label: 'People & teams', icon: 'code' }, { label: 'Business data', icon: 'data' }],
    outputs: [{ label: 'AI agents', icon: 'layers' }, { label: 'Salesforce', icon: 'cloud' }, { label: 'Integrations', icon: 'bolt' }],
    foundation: ['Clear boundaries', 'Governance', 'Maintainability'],
  },
  agents: {
    label: 'AI within an overall architecture', note: 'Conceptual architecture',
    center: { title: 'Business context', description: 'Processes, data & permissions', icon: 'layers' },
    inputs: [{ label: 'Business systems', icon: 'cloud' }, { label: 'Knowledge & data', icon: 'data' }, { label: 'Human oversight', icon: 'chart' }],
    outputs: [{ label: 'Agent runtimes', icon: 'code' }, { label: 'Workflows', icon: 'bolt' }, { label: 'System actions', icon: 'layers' }],
    foundation: ['Scoped access', 'Shared context', 'Review & oversight'],
  },
  salesforce: {
    label: 'A connected Salesforce foundation', note: 'Conceptual architecture',
    center: { title: 'Salesforce', description: 'A maintainable core', icon: 'cloud' },
    inputs: [{ label: 'Customer context', icon: 'data' }, { label: 'Business processes', icon: 'chart' }, { label: 'Existing systems', icon: 'layers' }],
    outputs: [{ label: 'Flows & Apex', icon: 'code' }, { label: 'Integrations', icon: 'bolt' }, { label: 'AI readiness', icon: 'layers' }],
    foundation: ['Data quality', 'Clear ownership', 'Reliable delivery'],
  },
};

export const experience = {
  hero: {
    detail: 'Architecture · Integration · Intelligence',
    artwork: {
      src: '/reference/Glowing AI Workflow Network.png', width: 1672, height: 941,
      alt: 'Glowing blue and cyan network connecting AI agents, workflows, security, business teams, and automation with subtle gold accents.',
    },
  },
  services: { eyebrow: 'TWO DISCIPLINES. ONE CONNECTED FOUNDATION.', title: 'Good architecture makes everything work better.', labels: ['AI & INTEGRATION', 'SALESFORCE'] },
  valueEyebrow: 'BUILT AROUND YOUR BUSINESS',
  showcase: {
    eyebrow: 'FROM ARCHITECTURE TO EXPERIENCE',
    brand: 'Augmented Enterprises',
    link: { label: 'Explore a Demo', href: '#product-previews' },
    notice: 'Illustrative product previews with example data. Augmented Enterprises is in development; these are not live application screens.',
    strategy: {
      id: 'strategy-preview', label: 'AI CONSULTANCY', title: 'AI Consultancy Strategy',
      subtitle: 'Design, build, and operationalize AI across your business.',
      navigationLabel: 'AI CONSULTANCY',
      navigation: [{ label: 'Overview', icon: 'layers' }, { label: 'Projects', icon: 'code' }, { label: 'Business agents', icon: 'chart' }, { label: 'Integrations', icon: 'data' }, { label: 'Settings', icon: 'bolt' }],
      stats: [{ label: 'Active Projects', value: '4' }, { label: 'Business Agents', value: '12' }, { label: 'Integrations', value: '8' }],
      activityTitle: 'Recent activity',
      activity: [{ title: 'Workspace architecture', status: 'Planning' }, { title: 'Agent access review', status: 'In review' }, { title: 'Integration mapping', status: 'Scoping' }],
    },
    workspace: {
      id: 'workspace-preview', label: 'BUSINESS WORKSPACE', title: 'Overview',
      subtitle: 'A focused view of your business agents and their readiness.',
      navigationLabel: 'AGENT STUDIO',
      navigation: [{ label: 'Overview', icon: 'layers' }, { label: 'Business agents', icon: 'chart' }, { label: 'Environments', icon: 'code' }, { label: 'Access packages', icon: 'data' }],
      businessLabel: 'ACTIVE BUSINESS', businessName: 'Example workspace',
      callout: { eyebrow: 'CONNECTED BUSINESS CONTEXT', title: 'Build your augmented enterprise.', description: 'Bring your business agents, authorized integrations, and execution environments into one workspace.', link: { label: 'Explore your agents', href: '/ai-solutions#capabilities' } },
      readiness: [{ label: 'Business context', value: 'Shared foundation' }, { label: 'Agent permissions', value: 'Scoped access' }],
    },
  } satisfies ProductShowcaseContent,
  philosophy: {
    eyebrow: 'OUR PHILOSOPHY', title: 'Build for change, not for a particular technology.', emphasis: 'Build for change',
    description: 'The right architecture gives your business options. We build modular, maintainable foundations that can evolve as your needs—and the technology—change.',
    link: { label: 'How we think about architecture', href: '/insights/philosophy' },
    principles: ['Business needs before platform choices', 'Modular systems with clear responsibilities', 'AI with shared context and appropriate governance'],
  },
  insights: { eyebrow: 'IDEAS BEHIND THE SYSTEMS', title: 'Thoughtful architecture. Practical perspective.', description: 'Explore the principles, decisions, and technology behind better business systems.', link: { label: 'Explore all Insights', href: '/insights' } },
  consultation: {
    eyebrow: 'LET’S BUILD THE RIGHT FOUNDATION', title: 'Your next chapter starts with a better architecture.',
    description: 'Bring us the business problem, the systems that need to connect, or the Salesforce org that needs a fresh perspective.',
    note: 'Business systems · AI architecture · Salesforce',
  },
  footer: { description: 'Connected business systems. Intelligent architecture.', navigationLabel: 'Footer navigation', legal: 'The Augmented Architect. Built for change.' },
  about: {
    eyebrow: 'THE THINKING BEHIND THE WORK', title: 'Architecture that serves the business.',
    description: 'We connect business goals with the systems, data, and technology needed to support them. Our approach is practical, technology-independent, and built around the ability to change.',
    principleTitle: 'A clear point of view. An open technology stack.',
    principleDescription: 'Custom software, Salesforce, n8n, Microsoft Copilot Studio, and AI runtimes can all have a place. The right combination depends on the process, the people, and the constraints—not a preference for one platform.',
    link: { label: 'Read our philosophy', href: '/insights/philosophy' },
  },
  inquiry: {
    eyebrow: 'START A CONVERSATION', title: 'Good systems start with the right questions.',
    description: 'A useful first conversation starts with your business: what needs to work better, where systems create friction, and what you want to make possible.',
    preparationTitle: 'What to bring to the conversation',
    items: [
      { title: 'The business problem', description: 'What is slowing the team down or getting in the way of a better customer experience?' },
      { title: 'The current landscape', description: 'Which systems, data sources, and processes are involved today?' },
      { title: 'The outcome you need', description: 'What should work differently, and what constraints do we need to respect?' },
    ],
    contactTitle: 'Contact details are being prepared.', contactNote: 'A direct contact method has not yet been configured on this website. No inquiry is submitted from this page.',
    bookTitle: 'Online scheduling is not connected yet.', bookNote: 'A scheduling link will be added once it is available. No appointment is created from this page.',
    contactLink: { label: 'View consultation details', href: '/book' }, bookLink: { label: 'Explore our services', href: '/#services' },
  },
};

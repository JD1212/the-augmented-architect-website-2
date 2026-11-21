import type { SiteLink } from './site';

type JourneyStage = {
  id: string; title: string; shortTitle: string; description: string;
  activities: readonly string[]; outcome: string;
};
type HowWeWorkContent = {
  seo: { title: string; description: string };
  hero: { eyebrow: string; title: string; emphasis: string; introduction: string; description: string; cta: string; journeyLink: string };
  journey: { label: string; title: string; description: string; outcomeLabel: string; stages: readonly JourneyStage[] };
  architecture: { eyebrow: string; title: string; paragraphs: readonly string[]; decisions: readonly { title: string; description: string }[]; link: SiteLink };
  engineering: { eyebrow: string; title: string; description: string; topics: readonly { title: string; description: string; outcome: string }[]; link: SiteLink };
  questions: { eyebrow: string; title: string; items: readonly { question: string; answer: string }[] };
  services: { label: string; links: readonly SiteLink[] };
  closing: { eyebrow: string; title: string; description: string; cta: string; note: string };
};

export const howWeWork = {
  seo: {
    title: 'How We Work With You',
    description: 'A business-first approach to AI consulting, custom applications, systems integration, and Salesforce modernization. Understand, design, build, and evolve with a clear scope.',
  },
  hero: {
    eyebrow: 'HOW WE WORK WITH YOU',
    title: 'Your business. Your agents.', emphasis: 'The right technology.',
    introduction: 'Start with the business. Build what it actually needs.',
    description: 'Before recommending an agent, application, or AI model, we understand your people, customers, systems, and goals. Then we design a connected foundation—and decide where AI can genuinely help.',
    cta: 'Book a Free Consultation', journeyLink: 'Explore the journey',
  },
  journey: {
    label: 'The engagement journey', title: 'A clear path, shaped around your business.',
    description: 'These six stages describe how we approach an engagement, not a fixed package or a promise to rebuild everything. We agree the priorities, deliverables, and depth of each stage with you.',
    outcomeLabel: 'What this gives you',
    stages: [
      {
        id: 'understand-your-business', title: 'Understand Your Business', shortTitle: 'Understand',
        description: 'We start with how work really happens: what customers need, how employees get things done, and where time, money, or information is lost.',
        activities: ['Walk through the customer and employee experience with the people who know it.', 'Choose meaningful outcomes, such as less repeated entry or a clearer path from inquiry to appointment, before choosing technology.'],
        outcome: 'Shared priorities and a practical definition of success.',
      },
      {
        id: 'map-existing-systems', title: 'Map Your Existing Systems', shortTitle: 'Map',
        description: 'Your existing software is part of the starting point. We identify the applications, records, workflows, and dependencies that already keep the business running.',
        activities: ['Trace where information originates, who owns it, and how it moves between systems.', 'Understand identities, access, integrations, and the business context people need to do their work.'],
        outcome: 'A clearer picture of what to keep, connect, and improve.',
      },
      {
        id: 'design-architecture', title: 'Design the Architecture', shortTitle: 'Design',
        description: 'Not every problem needs an agent. We decide what belongs in dependable application code, what needs an integration, and where AI offers a useful advantage.',
        activities: ['Define data boundaries, permissions, persistent context, authorized tools, and the environment where an agent can act.', 'Choose models and technologies for the job, with room to replace individual parts as requirements change.'],
        outcome: 'An agreed design, scope, and set of responsibilities before implementation.',
      },
      {
        id: 'build-and-connect', title: 'Build and Connect', shortTitle: 'Build & connect',
        description: 'We turn the agreed design into useful customer and employee experiences: applications, connected business systems, and carefully authorized AI capabilities.',
        activities: ['Build focused increments so you can review real behavior rather than wait for a final reveal.', 'Connect supported business APIs and, where useful, standards such as MCP—a way to expose specific tools to an AI application. Choose an agent runtime to suit the work, rather than forcing the business into one platform.'],
        outcome: 'Working software and integrations you can review against the agreed scope.',
      },
      {
        id: 'test-measure-refine', title: 'Test, Measure, and Refine', shortTitle: 'Test & refine',
        description: 'A convincing demonstration is only a starting point. We test reliability, access, tool behavior, performance, and costs against the outcomes that matter to your business.',
        activities: ['Check incomplete information, unavailable integrations, and incorrect agent responses—not just the happy path.', 'Introduce confirmation and human review where actions carry consequences; refine the system using observed results.'],
        outcome: 'Evidence for launch decisions, with known limitations made visible.',
      },
      {
        id: 'launch-support-evolve', title: 'Launch, Support, and Evolve', shortTitle: 'Launch & evolve',
        description: 'We plan a responsible release and a clear handoff. You should understand what has been built, who operates it, and how to recognize when something needs attention.',
        activities: ['Agree deployment, documentation, administrator handoff, and appropriate activity and error visibility.', 'Set operational ownership and separately agree any ongoing support or improvements as the business changes.'],
        outcome: 'A foundation your business can understand, operate, and extend.',
      },
    ],
  },
  architecture: {
    eyebrow: 'ARCHITECTURE BEFORE AUTOMATION', title: 'The latest model is not a business architecture.',
    paragraphs: ['A capable model still needs reliable information, clearly defined access, and useful tools. Without those foundations, another automation can simply create another disconnected system.', 'We start with the outcome, then design how people, data, software, and agents should work together. That makes technology choices deliberate—and makes individual parts easier to change later.'],
    decisions: [
      { title: 'Keep what works', description: 'Conventional software for clear, repeatable rules. Existing systems where they already serve the business well.' },
      { title: 'Connect what matters', description: 'Shared context and supported integrations, with explicit identities, permissions, and ownership.' },
      { title: 'Add intelligence deliberately', description: 'AI for work that benefits from interpretation or conversation, with bounded tools and appropriate review.' },
    ],
    link: { label: 'Read our philosophy', href: '/our-approach/philosophy' },
  },
  engineering: {
    eyebrow: 'MORE THAN A PROMPT', title: 'Engineering depth. Practical decisions.',
    description: 'You do not need a textbook to make informed choices. You do need an architect who understands what sits beneath the interface—and can explain why it matters.',
    topics: [
      { title: 'Useful business context', description: 'Language models work with tokens; embeddings represent meaning for retrieval and vector search. We consider how approved information, persistent memory, and current business records should be supplied to the system.', outcome: 'The right information, with a traceable source and appropriate access.' },
      { title: 'Controlled actions', description: 'An agent execution loop combines model decisions with tool calls. Skills define task guidance; a runtime coordinates execution. We design those pieces around authorized business operations, not unrestricted access.', outcome: 'Clear boundaries around what an agent can do—and when a person must approve.' },
      { title: 'Visible, testable behavior', description: 'Evaluation checks response quality and failure cases. Observability makes activity and errors inspectable; usage measurements help assess cost and performance where providers support them.', outcome: 'A system that can be assessed and improved, with limits stated honestly.' },
    ],
    link: { label: 'Explore our AI & Architecture approach', href: '/our-approach/ai-architecture' },
  },
  questions: {
    eyebrow: 'PRACTICAL QUESTIONS', title: 'Clarity before commitment.',
    items: [
      { question: 'Do we have to replace our existing software?', answer: 'No. We first identify what is working and where the gaps are. A supported integration or a focused improvement may be more useful than a replacement. Salesforce modernization, for example, can begin with one area of automation while preserving the rest of your org.' },
      { question: 'How do you approach data security?', answer: 'We define who can access which information and authorize specific operations. Credentials belong on the server, permissions should be enforced where data is accessed, and sensitive context should be shared only when necessary. The exact controls and provider choices depend on the project; we do not promise a compliance certification or a risk-free system.' },
      { question: 'How do we control scope and AI costs?', answer: 'We agree deliverables and supported connections before development. Where AI or paid APIs are involved, we define appropriate request limits, approval steps, and usage visibility. Implementation, hosting, provider usage, and any ongoing support are discussed explicitly; unmeasured costs are not presented as known savings.' },
      { question: 'Will people still have control?', answer: 'Yes. We decide which actions can run within agreed boundaries and which need confirmation or human review. We test failures and provide an operational handoff so the system is understandable. An agent is not a substitute for business ownership or accountability.' },
    ],
  },
  services: {
    label: 'Apply this approach to your business',
    links: [{ label: 'AI Solutions & Architecture', href: '/ai-solutions' }, { label: 'Salesforce Modernization', href: '/salesforce' }, { label: 'Custom Business Applications', href: '/custom-applications' }],
  },
  closing: {
    eyebrow: 'START WITH A CONVERSATION', title: 'Tell us how your business works.',
    description: 'Bring the problem, the systems you already use, and the outcome you want. We can discuss a sensible place to start—without committing you to a particular platform.',
    cta: 'Book a Free Consultation', note: 'A free 30-minute conversation. No technical preparation required.',
  },
} as const satisfies HowWeWorkContent;

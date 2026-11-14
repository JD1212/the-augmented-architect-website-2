import type { ServiceFaqCopy } from './faq-types';
type TextPair = readonly [title: string, description: string];
type SectionCopy = { eyebrow: string; title: string; description: string };
type CustomApplicationsContent = {
  href: '/custom-applications'; navigationLabel: string; name: string;
  seo: { title: string; description: string };
  hero: SectionCopy & { subtitle: string; tagline: string; cta: string; secondary: string; price: string; clarification: string; packageLabel: string; foundation: readonly string[] };
  problem: SectionCopy & { points: readonly string[] };
  solution: SectionCopy & { layers: readonly TextPair[]; diagram: { label: string; steps: readonly string[]; existing: string; caption: string } };
  package: SectionCopy & { capabilities: readonly TextPair[]; note: string; examplesTitle: string; examplesNote: string; examples: readonly { title: string; steps: readonly string[] }[] };
  faq: ServiceFaqCopy;
  future: SectionCopy & { capabilities: readonly string[]; protocols: string; boundaries: string; platform: string; linkLabel: string; linkHref: string };
  approach: SectionCopy & { stages: readonly TextPair[] };
  closing: { title: string; description: string; preparation: string };
};

export const customApplications = {
  href: '/custom-applications', navigationLabel: 'Custom Business Applications', name: 'AI-Ready Business Platform',
  seo: {
    title: 'Custom Business Applications & Customer Portals',
    description: 'AI-ready business applications for small and midsize businesses: modern websites, customer portals, and connected workflows. Implementations starting at $10,000.',
  },
  hero: {
    eyebrow: 'CUSTOM BUSINESS APPLICATIONS', title: 'Your website is just the beginning.',
    subtitle: 'Turn your website into a connected business application.',
    description: 'We build modern digital experiences that connect your customers, employees, and existing business tools—giving your business a practical foundation for automation and AI.',
    tagline: "Your business. Connected. Ready for what's next.",
    cta: 'Book a Free Consultation', secondary: "See What's Included",
    price: 'Implementation starting at $10,000',
    clarification: 'Defined-scope implementation. Additional integrations, advanced AI features, and ongoing support quoted separately.',
    packageLabel: 'A FOCUSED IMPLEMENTATION',
    foundation: ['Your public website', 'Customer access', 'A private team workspace', 'One connected business workflow'],
  },
  problem: {
    eyebrow: 'WHEN YOUR TOOLS WORK APART', title: "Your website shouldn't be disconnected from your business.",
    description: 'A marketing website. A CRM. Email inquiries, tracking spreadsheets, and separate scheduling software. Your team moves information between them while customers call for basic updates. The data is there; the connected experience is missing.',
    points: ['Information scattered across applications.', 'Repeated manual data entry.', 'Customers calling or emailing for basic updates.', 'Employees without a unified workspace.', 'Limited visibility into customer relationships and activity.', 'Disconnected systems that make automation and AI harder to introduce.'],
  },
  solution: {
    eyebrow: 'ONE BUSINESS · A CONNECTED FOUNDATION', title: 'One connected experience for your customers and your team.',
    description: 'We transform traditional business websites into modern, connected applications—with customer access, a private team workspace, integrated business workflows, and a foundation for future AI.',
    layers: [
      ['Your public website', 'A professionally designed, mobile-friendly website that represents your business, communicates its services, and captures customer interest.'],
      ['Your customer portal', 'Secure login and a defined customer experience. Depending on the agreed scope, customers might access requests, booking information, project status, or account details.'],
      ['Your business workspace', 'A private application where authorized employees manage customer information, inquiries, and agreed business records. Connect the tools you already use without replacing every application.'],
    ],
    diagram: {
      label: 'ILLUSTRATIVE ARCHITECTURE',
      steps: ['PUBLIC WEBSITE', 'CUSTOMER EXPERIENCE / CUSTOMER LOGIN', 'SHARED BUSINESS DATA & IDENTITY', 'PRIVATE BUSINESS WORKSPACE'],
      existing: 'EXISTING BUSINESS SYSTEMS',
      caption: 'Connected experiences, shared identities, and permissioned access. Integration boundaries depend on the systems and scope agreed for your business.',
    },
  },
  package: {
    eyebrow: 'THE STARTING IMPLEMENTATION', title: 'A connected business foundation. Starting at $10,000.',
    description: 'An initial implementation tailored to one defined business workflow and an agreed, bounded scope. We shape the customer experience, team workspace, and integration around that practical starting point.',
    capabilities: [
      ['Modern business website', 'A responsive, search-friendly public website within an agreed page and design scope. This can include replacing an existing WordPress marketing site.'],
      ['Customer access', 'Basic secure customer authentication and a defined customer-facing portal experience.'],
      ['Team workspace', 'Secure employee/admin login and a practical dashboard for managing the agreed business workflow.'],
      ['Connected business data', 'A structured database for customers, inquiries, and a defined set of operational records.'],
      ['Identity and permissions foundation', 'Customer and employee profiles, basic role-based access, and references to records in connected systems where applicable.'],
      ['One business integration', 'One supported, agreed integration with an existing CRM, scheduling system, or other business application, subject to available APIs and project scope.'],
      ['One working business workflow', 'An end-to-end process connecting customer access, the team workspace, and agreed data—for example, a service inquiry becoming a managed customer request.'],
      ['AI-ready architecture', 'Documented data relationships, defined integration boundaries, and a technical foundation for future AI agents and additional automation.'],
      ['Deployment and handoff', 'Initial deployment configuration, implementation documentation, and basic administrator orientation.'],
    ],
    note: 'The starting package is tailored to a defined business workflow and agreed implementation scope. Complex integrations, extensive data migration, additional portal modules, custom AI agents, and ongoing support are quoted separately.',
    examplesTitle: 'A practical starting point for your business.',
    examplesNote: 'Illustrative workflows. These are possible applications, not claims of completed client projects or features included in every implementation.',
    examples: [
      { title: 'Service businesses', steps: ['Customer inquiry', 'Request tracking', 'Team assignment', 'Customer updates'] },
      { title: 'Contractors', steps: ['Website inquiry', 'Customer profile', 'Project/job tracking', 'Staff coordination'] },
      { title: 'Tourism and hospitality', steps: ['Experience inquiry', 'Booking information', 'Guest record', 'Team operations'] },
    ],
  },
  faq: {
    title: 'Questions Before You Modernize',
    introduction: 'Wondering about cost, SEO, growth, or how AI fits into your business?',
    closeLabel: 'Close modernization questions', scrollLabel: 'Frequently asked questions and answers',
    items: [
      {
        question: 'Can a small business really afford a full custom application?',
        paragraphs: [
          'Yes. Modern development tools and AI-assisted engineering have made custom applications much more accessible than they once were.',
          "The value isn't simply writing code faster. It's having an experienced software architect who knows how to design secure systems, connect business data, and use AI-assisted development effectively.",
          'Our starting $10,000 engagement delivers a complete, production-ready application for an agreed initial scope—including the modern website, customer access, internal workspace, business data foundation, and a defined operational workflow.',
          'Additional capabilities can be introduced as the business grows.',
        ],
      },
      {
        question: 'Will I lose my existing website or Google rankings?',
        paragraphs: [
          'Not necessarily. We can modernize an existing WordPress or traditional website while preserving its domain, important URLs, content, metadata, and existing search visibility wherever possible.',
          'When URLs need to change, we plan redirects and appropriate SEO migration practices.',
          'Search rankings cannot be guaranteed, but protecting your existing SEO investment is part of the modernization process.',
        ],
      },
      {
        question: 'How will a modern business application help my business grow?',
        paragraphs: [
          'A connected application can make it easier for customers to discover your business, submit inquiries, interact with your team, and access relevant information.',
          'Your employees can manage those interactions through a shared workspace instead of relying on disconnected emails, spreadsheets, and applications.',
          'That can reduce manual work, improve responsiveness, and support more consistent customer experiences.',
          'We can also expand search optimization, content publishing, customer communications, and workflow automation as your needs evolve.',
        ],
      },
      {
        question: 'Why not just add an AI agent to my existing website?',
        paragraphs: [
          "There's nothing inherently wrong with starting with one AI agent. For some businesses, that's an appropriate first step.",
          'But an agent becomes much more useful when it can securely access relevant business information.',
          'If your customer records, scheduling information, projects, and communications are disconnected, the agent may lack the context necessary to provide meaningful assistance.',
          'We focus on creating a connected business foundation so that future agents can work with authorized customer information, business records, and workflows.',
        ],
      },
      {
        question: 'What do you mean by business context and customer journey?',
        paragraphs: [
          'Business context is the information that helps your systems understand who a customer is, what their relationship with your business involves, and what work is taking place.',
          'A customer journey is the sequence of interactions someone has with your business—from discovering your services and making an inquiry through receiving service and becoming a returning customer.',
          'We design applications that connect those interactions and preserve useful context across supported systems.',
          'That creates a better experience for customers, employees, and future AI agents.',
        ],
      },
      {
        question: 'Will I have to replace all my existing business software?',
        paragraphs: [
          'Usually not. The goal is to connect the systems that already work well while improving the parts of your operation that are fragmented or inefficient.',
          'We can integrate supported CRMs, scheduling applications, and other business software through their available APIs.',
          'The starting package includes one agreed, supported integration. Additional integrations are scoped separately.',
        ],
      },
      {
        question: 'Can we add automated blogging, marketing, and AI agents later?',
        paragraphs: [
          'Yes. A modern application can provide a foundation for future capabilities such as content management, AI-assisted article drafting, workflow automation, and intelligent customer support.',
          'SEO improvements and content strategy should prioritize useful, original information and human review rather than automatically publishing large volumes of low-quality articles.',
          'Advanced content automation, additional integrations, and custom AI agents are optional services, not automatically included in the $10,000 starting package.',
        ],
      },
      {
        question: 'What exactly does the $10,000 starting price include?',
        paragraphs: [
          'It covers a defined initial implementation: a modern public website, basic secure customer and team access, a structured business database, one agreed integration, one end-to-end business workflow, deployment, and initial handoff.',
          'We define the exact scope during discovery so there are clear expectations about what will be delivered.',
          'Complex migrations, extensive custom features, multiple integrations, ongoing hosting/support, and custom AI agents are quoted separately.',
        ],
      },
    ],
  },
  future: {
    eyebrow: 'BUILT FOR THE FUTURE OF AI', title: 'Build the foundation now. Add intelligence as your business grows.',
    description: 'AI becomes more useful when it has controlled access to connected business information, customer identities, relevant context, and authorized operations. A clearer foundation makes future expansion more practical.',
    capabilities: ['Customer assistants that help people navigate services and request information.', 'Agents that retrieve authorized business context.', 'Automation connecting scheduling, CRM, operations, and customer workflows.', 'Coordinated intelligent workflows across supported applications.', 'Operational visibility and future agent management capabilities.'],
    protocols: 'Where appropriate, MCP can standardize tool access and A2A can support communication between compatible agents. They are interoperability protocols, not business applications or guaranteed connectivity. Not every system supports them or the required APIs; A2A is not needed for ordinary integrations or single-agent workflows.',
    boundaries: 'We choose integration methods around your actual business systems. AI-ready means the foundation supports later expansion—not that custom agents or distributed workflows are included at launch.',
    platform: 'Augmented Enterprises is our broader platform direction, currently in development. It is not a dependency or a promised completed feature of this implementation.',
    linkLabel: 'Explore AI Solutions & Architecture', linkHref: '/ai-solutions',
  },
  approach: {
    eyebrow: 'START FOCUSED · EXPAND WITH PURPOSE', title: 'A clear scope. A working foundation. Room to grow.',
    description: 'Begin with the workflow that matters most. Define what is included, connect the right pieces, and expand as your business is ready.',
    stages: [
      ['DISCOVER', 'Understand your business, current website, applications, and most important workflow.'],
      ['DESIGN', 'Define the customer experience, business workspace, integration boundaries, and agreed implementation scope.'],
      ['BUILD & CONNECT', 'Develop the website, portal, admin workspace, and selected integration and workflow.'],
      ['LAUNCH & EXPAND', 'Deploy, validate, train, and identify sensible future automation or AI improvements.'],
    ],
  },
  closing: {
    title: 'Your business deserves more than a website.',
    description: "Let's turn your existing tools, customer interactions, and everyday workflows into a connected business experience.",
    preparation: "Tell us what your business does, what software you already use, and what you'd like to improve.",
  },
} as const satisfies CustomApplicationsContent;

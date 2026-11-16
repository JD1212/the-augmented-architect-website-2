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
  assistant: SectionCopy & { capabilities: readonly TextPair[]; boundaries: string };
  faq: ServiceFaqCopy;
  future: SectionCopy & { capabilities: readonly string[]; protocols: string; boundaries: string; platform: string; linkLabel: string; linkHref: string };
  approach: SectionCopy & { stages: readonly TextPair[] };
  closing: { title: string; description: string; preparation: string };
};

export const customApplications = {
  href: '/custom-applications', navigationLabel: 'Custom Business Applications', name: 'AI-Ready Business Platform',
  seo: {
    title: 'Custom Business Applications & Customer Portals',
    description: 'AI-ready business applications for small and midsize businesses: modern websites, secure portals, one AI assistant with appointment scheduling, and a connected workflow. Starting at $10,000.',
  },
  hero: {
    eyebrow: 'CUSTOM BUSINESS APPLICATIONS', title: 'Your website is just the beginning.',
    subtitle: 'Turn your website into a connected, intelligent business application.',
    description: 'We connect your website, customer portal, and private team workspace with structured business data, one customer-facing AI assistant, and real appointment scheduling—built around a defined business workflow.',
    tagline: "Your business. Connected. Ready for what's next.",
    cta: 'Book a Free Consultation', secondary: "See What's Included",
    price: 'Implementation starting at $10,000',
    clarification: 'Includes one AI assistant with appointment scheduling. Additional agents, integrations, complex workflows, and ongoing support are separately scoped.',
    packageLabel: 'A FOCUSED IMPLEMENTATION',
    foundation: ['Public website & secure customer portal', 'Private workspace, data & permissions', 'One AI assistant & appointment scheduling', 'One business integration & defined workflow'],
  },
  problem: {
    eyebrow: 'WHEN YOUR TOOLS WORK APART', title: "Your website shouldn't be disconnected from your business.",
    description: 'A marketing website. A CRM. Email inquiries, tracking spreadsheets, and separate scheduling software. Your team moves information between them while customers call for basic updates. The data is there; the connected experience is missing.',
    points: ['Information scattered across applications.', 'Repeated manual data entry.', 'Customers calling or emailing for basic updates.', 'Employees without a unified workspace.', 'Limited visibility into customer relationships and activity.', 'Disconnected systems that make automation and AI harder to introduce.'],
  },
  solution: {
    eyebrow: 'ONE BUSINESS · A CONNECTED FOUNDATION', title: 'One connected experience for your customers and your team.',
    description: 'We transform traditional business websites into connected applications—with defined customer access, a private team workspace, one working AI assistant, real appointment scheduling, and an agreed business integration and workflow.',
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
    description: 'A defined-scope launch package connecting your public website, customer portal, private workspace, business data, and one customer-facing AI assistant with real appointment scheduling. It also includes one agreed supported business-system integration and one end-to-end workflow.',
    capabilities: [
      ['Modern business website', 'A responsive, search-friendly public website within an agreed page and design scope. This can include replacing an existing WordPress marketing site.'],
      ['Defined secure customer portal', 'Secure customer authentication and a defined portal experience for the agreed customer journey. Portal modules and customer-visible records are specified during discovery.'],
      ['Private team/admin workspace', 'Secure employee/admin access and a practical workspace for managing the agreed business records and workflow.'],
      ['Structured data, identity & permissions', 'A structured foundation for customers, inquiries, and agreed operational records, with customer/team identities, role-based permissions, and references to connected systems where applicable.'],
      ['One customer-facing AI assistant', 'One assistant, similar to Scout, configured with approved business information to answer questions, help customers discover services, and use its agreed authorized tools.'],
      ['Real conversational appointment scheduling', 'The included assistant checks real calendar availability and helps customers schedule appointments through one supported, authorized calendar connection. Booking rules, confirmation, verification, and supported appointment-management actions are defined in scope.'],
      ['One business integration & workflow', 'In addition to the scheduling calendar connection, one agreed supported external business-system integration and one defined end-to-end workflow—for example, a service inquiry becoming a managed customer request. Available APIs, access, and agreed scope determine the boundary.'],
      ['Architecture for further automation', 'Documented data relationships, integration boundaries, and agent-tool permissions support adding further integrations, agents, and business automation without promising unlimited functionality.'],
      ['Deployment, documentation & handoff', 'Initial deployment configuration, implementation documentation, and basic administrator handoff for the agreed launch scope.'],
    ],
    note: 'Standard appointment scheduling includes one agreed supported calendar connection, separate from the one included external business-system integration. Provider support, API permissions, workflow boundaries, and acceptance criteria are confirmed during discovery. Additional agents, advanced multi-agent systems, complex workflows, further integrations, extensive migration, extra portal modules, and ongoing hosting, service usage, or support are separately scoped.',
    examplesTitle: 'A practical starting point for your business.',
    examplesNote: 'Illustrative workflows. These are possible applications, not claims of completed client projects or features included in every implementation.',
    examples: [
      { title: 'Service businesses', steps: ['Customer inquiry', 'Request tracking', 'Team assignment', 'Customer updates'] },
      { title: 'Contractors', steps: ['Website inquiry', 'Customer profile', 'Project/job tracking', 'Staff coordination'] },
      { title: 'Tourism and hospitality', steps: ['Experience inquiry', 'Booking information', 'Guest record', 'Team operations'] },
    ],
  },
  assistant: {
    eyebrow: 'INCLUDED AT LAUNCH', title: 'An AI assistant that connects the conversation to your business.',
    description: 'Your starting package includes one customer-facing assistant, similar to Scout, configured with your approved business information and a defined set of authorized tools. It helps customers move from asking a question to taking a practical next step.',
    capabilities: [
      ['Answer business questions', 'Help customers understand your services, agreed package details, and business information. The assistant works from approved content and acknowledges what it does not know.'],
      ['Help customers discover services', 'Guide visitors toward relevant services and offer a consultation when appropriate, without repeatedly pushing them to book.'],
      ['Schedule through real tools', 'Check actual availability, apply the agreed booking rules, and request explicit confirmation before creating an appointment through the authorized calendar integration. Supported cancellation or rescheduling uses defined ownership verification.'],
      ['Operate within clear boundaries', 'Knowledge, tool access, permissions, and the initial workflow are agreed during discovery. The assistant does not receive unrestricted access to business systems or promise unsupported actions.'],
    ],
    boundaries: 'The standard scheduling calendar connection is included separately from the one agreed external business-system integration. Additional assistants, specialized agent tools, advanced multi-agent systems, complex workflows, and further integrations are separately scoped. Ongoing hosting and provider/service usage are not included in the starting implementation fee.',
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
          'Our starting $10,000 engagement includes a modern public website, defined secure customer portal, private team/admin workspace, structured data and permissions, one customer-facing AI assistant with real appointment scheduling, one agreed supported business-system integration, one defined end-to-end workflow, deployment, documentation, and basic administrator handoff.',
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
          'Our starting package includes one customer-facing assistant, similar to Scout, configured with approved business information and real appointment scheduling. We give it defined tools and permissions within a connected business foundation; broader access to customer records or additional operations must be explicitly scoped and authorized.',
        ],
      },
      {
        question: 'What do you mean by business context and customer journey?',
        paragraphs: [
          'Business context is the information that helps your systems understand who a customer is, what their relationship with your business involves, and what work is taking place.',
          'A customer journey is the sequence of interactions someone has with your business—from discovering your services and making an inquiry through receiving service and becoming a returning customer.',
          'We design applications that connect those interactions and preserve useful context across supported systems.',
          'That supports the included assistant and creates a clearer foundation for customers, employees, and additional agents as your business grows.',
        ],
      },
      {
        question: 'Will I have to replace all my existing business software?',
        paragraphs: [
          'Usually not. The goal is to connect the systems that already work well while improving the parts of your operation that are fragmented or inefficient.',
          'We can integrate supported CRMs, scheduling applications, and other business software through their available APIs.',
          'The starting package includes the standard scheduling calendar connection plus one separate, agreed supported business-system integration and one defined end-to-end workflow. Support depends on available APIs and authorized access; further integrations are separately scoped.',
        ],
      },
      {
        question: 'Can we add automated blogging, marketing, and AI agents later?',
        paragraphs: [
          'Yes. A modern application can provide a foundation for future capabilities such as content management, AI-assisted article drafting, workflow automation, and intelligent customer support.',
          'SEO improvements and content strategy should prioritize useful, original information and human review rather than automatically publishing large volumes of low-quality articles.',
          'One customer-facing AI assistant with real appointment scheduling is included at launch. Additional agents, advanced multi-agent systems, complex workflows, content automation, and further integrations are separately scoped and not automatically included in the $10,000 starting package.',
        ],
      },
      {
        question: 'What exactly does the $10,000 starting price include?',
        paragraphs: [
          'It includes a modern public business website, defined secure customer portal access, a private team/admin workspace, structured data, identity and permissions, one customer-facing AI assistant using approved business information, real conversational appointment scheduling, one agreed supported business-system integration and one defined end-to-end workflow, extensible architecture, deployment, documentation, and basic administrator handoff.',
          'We define the exact scope during discovery so there are clear expectations about what will be delivered.',
          'The standard scheduling calendar connection is included separately from the one external business-system integration. Additional agents, advanced multi-agent systems, complex workflows, further integrations, extensive migrations, extra functionality, and ongoing hosting, service usage, or support are separately scoped.',
        ],
      },
    ],
  },
  future: {
    eyebrow: 'BUILT FOR THE FUTURE OF AI', title: 'Launch with one AI assistant. Expand as your business grows.',
    description: 'One working customer-facing AI assistant with real appointment scheduling is included at launch. Structured business data, defined identities, permissions, and authorized tools provide the foundation for adding further intelligence as your needs grow.',
    capabilities: ['Included at launch: one assistant using approved business information and real appointment scheduling.', 'Defined data, identity, permission, and tool boundaries for the agreed implementation.', 'Architecture for adding supported integrations and agent tools.', 'Additional agents and advanced multi-agent systems are separately scoped.', 'Complex workflows, broader automation, and further integrations are separately scoped.'],
    protocols: 'Where appropriate, MCP can standardize tool access and A2A can support communication between compatible agents. They are interoperability protocols, not business applications or guaranteed connectivity. Not every system supports them or the required APIs; A2A is not needed for ordinary integrations or single-agent workflows.',
    boundaries: 'AI-ready means a working assistant is included at launch. Its approved knowledge, scheduling tools, and access boundaries are defined in scope. Additional agents, advanced multi-agent systems, complex workflows, broader automation, and further integrations require separate assessment and agreement.',
    platform: 'Augmented Enterprises is our broader platform direction, currently in development. It is not a dependency or a promised completed feature of this implementation.',
    linkLabel: 'Explore AI Solutions & Architecture', linkHref: '/ai-solutions',
  },
  approach: {
    eyebrow: 'START FOCUSED · EXPAND WITH PURPOSE', title: 'A clear scope. A working foundation. Room to grow.',
    description: 'Begin with the workflow that matters most. Define what is included, connect the right pieces, and expand as your business is ready.',
    stages: [
      ['DISCOVER', 'Understand your business, current website, applications, and most important workflow.'],
      ['DESIGN', 'Define the customer experience, business workspace, integration boundaries, and agreed implementation scope.'],
      ['BUILD & CONNECT', 'Develop the website, portal, admin workspace, included assistant and scheduling, and agreed business integration and workflow.'],
      ['LAUNCH & EXPAND', 'Validate the agreed workflow and assistant, deploy, document, provide basic administrator handoff, and identify sensible next steps.'],
    ],
  },
  closing: {
    title: 'Your business deserves more than a website.',
    description: "Let's turn your existing tools, customer interactions, and everyday workflows into a connected business experience.",
    preparation: "Tell us what your business does, what software you already use, and what you'd like to improve.",
  },
} as const satisfies CustomApplicationsContent;

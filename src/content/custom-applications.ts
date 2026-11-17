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
    description: 'Extensible business applications with websites, portals, team workspaces, structured data, supported integrations, and an included AI assistant. Starting at $10,000.',
  },
  hero: {
    eyebrow: 'CUSTOM BUSINESS APPLICATIONS', title: 'Your website is just the beginning.',
    subtitle: 'Build the connected foundation for your next stage of business.',
    description: 'Bring your public website, customer portal, and private team workspace into one connected business application. Structured data, identity, permissions, and our integration tooling give your team a practical foundation to work efficiently and expand with AI.',
    tagline: "Your business. Connected. Ready for what's next.",
    cta: 'Book a Free Consultation', secondary: "See What's Included",
    price: 'Implementation starting at $10,000',
    clarification: 'Defined starting scope with up to four agreed, supported integrations, including scheduling where applicable. Includes one customer-facing AI assistant; advanced capabilities and ongoing services are separately scoped.',
    packageLabel: 'A FOCUSED IMPLEMENTATION',
    foundation: ['Website, customer portal & private workspace', 'Structured data, identity & permissions', 'Proprietary driver management · up to four integrations', 'One AI website assistant & agent connection management'],
  },
  problem: {
    eyebrow: 'WHEN YOUR TOOLS WORK APART', title: "Your website shouldn't be disconnected from your business.",
    description: 'A marketing website. A CRM. Email inquiries, tracking spreadsheets, and separate scheduling software. Your team moves information between them while customers call for basic updates. The data is there; the connected experience is missing.',
    points: ['Information scattered across applications.', 'Repeated manual data entry.', 'Customers calling or emailing for basic updates.', 'Employees without a unified workspace.', 'Limited visibility into customer relationships and activity.', 'Disconnected systems that make automation and AI harder to introduce.'],
  },
  solution: {
    eyebrow: 'ONE BUSINESS · A CONNECTED FOUNDATION', title: 'One connected experience for your customers and your team.',
    description: 'We specialize in custom-designed and custom-developed business applications that connect customer experiences and team operations around shared information, clear permissions, and supported integrations. We favor custom-built software because AI-assisted development helps us build, test, extend, and maintain it efficiently. An included website assistant helps customers understand your services and book appointments through real tools.',
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
    description: 'An extensible, AI-ready business application that connects your public presence, customer relationships, and everyday operations. The starting scope combines a website, portal, team workspace, structured data, our integration driver and management interface, and one customer-facing AI sales assistant.',
    capabilities: [
      ['Modern business website', 'A responsive, search-friendly public website that presents your business and helps customers take the next step, within an agreed page and design scope.'],
      ['Defined secure customer portal', 'Secure customer access to the agreed information and interactions, creating a consistent experience from first inquiry through ongoing service.'],
      ['Private team/admin workspace', 'A focused workspace for authorized employees to manage customer relationships, business records, and the operations defined for launch.'],
      ['Structured data, identity & permissions', 'Shared customer and operational information, clear business identities, and role-based permissions provide a reliable foundation across the application.'],
      ['Integration driver & management interface', 'Our proprietary driver framework and management interface organize reviewed connections, authentication, verification, and supported operations. Up to four agreed supported integrations are included in the starting scope, counting scheduling/calendar where applicable.'],
      ['Supported agent connection management', 'Organize supported agent connections and inspect available capabilities through a management interface. Activity, usage, and cost views are included only where their implementation and provider data are verified; comprehensive cross-provider monitoring is not a completed launch capability.'],
      ['AI sales assistant & real scheduling', 'One customer-facing AI sales/website assistant, similar to Scout, explains approved business information, guides visitors to relevant services, and books appointments through authorized scheduling tools with explicit confirmation.'],
      ['Architecture for business growth', 'Defined data relationships, tool permissions, integration boundaries, and documentation make room for additional workflows, agents, and business capabilities as priorities evolve.'],
      ['Deployment, documentation & handoff', 'Initial deployment, implementation documentation, and basic administrator handoff support a practical launch and a clear path for future changes.'],
    ],
    note: 'The starting scope includes up to four agreed, supported integrations in total; the scheduling/calendar connection counts toward that allowance where applicable. We confirm provider access, supported operations, workflow boundaries, and acceptance criteria during discovery. New driver development, substantial custom integration work, advanced capabilities, and ongoing hosting, provider usage, or support are separately scoped.',
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
    description: 'As part of your connected application, one customer-facing AI sales/website assistant helps visitors understand your business, find relevant services, and book a conversation with your team. Like Scout, it uses approved information and defined tools to turn interest into a practical next step.',
    capabilities: [
      ['Answer business questions', 'Help customers understand your services, agreed package details, and business information. The assistant works from approved content and acknowledges what it does not know.'],
      ['Help customers discover services', 'Guide visitors toward relevant services and offer a consultation when appropriate, without repeatedly pushing them to book.'],
      ['Schedule through real tools', 'Check actual availability, apply the agreed booking rules, and request explicit confirmation before creating an appointment through the authorized calendar integration. Supported cancellation or rescheduling uses defined ownership verification.'],
      ['Operate within clear boundaries', 'Knowledge, tool access, permissions, and the initial workflow are agreed during discovery. The assistant does not receive unrestricted access to business systems or promise unsupported actions.'],
    ],
    boundaries: 'The assistant works within approved information, permissions, and scheduling rules. Its calendar connection is part of the up-to-four integration allowance where applicable. Further agent tools and business workflows can be added through an agreed extension of the implementation.',
  },
  faq: {
    title: 'Questions Before You Modernize',
    introduction: 'Wondering about cost, SEO, growth, or how AI fits into your business?',
    closeLabel: 'Close modernization questions', scrollLabel: 'Frequently asked questions and answers',
    items: [
      {
        question: 'Can a small business really afford a full custom application?',
        paragraphs: [
          'Yes. Modern development tools and AI-assisted engineering have made custom software much more accessible.',
          'We typically build with Next.js, TypeScript, Supabase, and Vercel, creating modern applications that are easier to extend and adapt as your business grows. We choose the technology based on your needs, not a fixed platform.',
          'Our custom business applications start at $10,000 for a clearly defined implementation that connects your website, customers, employees, and business systems.',
          "Rather than paying for disconnected tools indefinitely, you're investing in a foundation designed around how your business actually operates.",
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
          'The starting package includes up to four agreed supported integrations in total, including the scheduling/calendar connection where applicable. Our proprietary driver framework and management interface support configuring and managing reviewed connections. Available APIs, authorized access, and the operations required determine which systems fit the starting scope.',
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
          'Our starting implementation includes:',
          '• A modern, custom-built public website.',
          '• A secure customer portal.',
          '• A private workspace for your team and administrators.',
          '• Structured business data, user identities, and permissions.',
          '• Up to four agreed supported integrations, including scheduling/calendar where applicable.',
          '• One AI website assistant, similar to Scout, that can answer customer questions and schedule appointments.',
          '• Supported agent connection management.',
          '• Deployment, documentation, and basic administrator handoff.',
          'Behind the scenes, we build the application around a modular architecture designed to support future integrations, automations, and intelligent agents.',
          "We define the exact deliverables during discovery, so you know what's included before development begins.",
          'Additional agents, advanced workflows, extensive migrations, custom integration development, and ongoing services are quoted separately. Comprehensive cross-provider agent activity and cost monitoring are not included as completed capabilities in the starting package.',
        ],
      },
    ],
  },
  future: {
    eyebrow: 'BUILT FOR THE FUTURE OF AI', title: 'A foundation that grows with your business.',
    description: 'Start with connected customer and team experiences, reusable integration tooling, supported agent connection management, and one working website assistant. Clear data relationships and permissions make it easier to add business capabilities without rebuilding the foundation.',
    capabilities: ['A working website assistant with approved knowledge and real scheduling tools.', 'Shared business data, identity, permissions, and defined integration boundaries.', 'Reusable driver and management tooling for agreed supported connections.', 'A foundation for additional workflows, agent tools, and integrations.', 'Supported agent connection views, with monitoring capabilities assessed against actual available data.'],
    protocols: 'Where appropriate, MCP can standardize tool access and A2A can support communication between compatible agents. They are interoperability protocols, not business applications or guaranteed connectivity. Not every system supports them or the required APIs; A2A is not needed for ordinary integrations or single-agent workflows.',
    boundaries: 'The starting implementation includes a working assistant and defined management capabilities. Additional agents, advanced multi-agent systems, complex automation, and further integrations are separately scoped. General agent activity dashboards and unified provider usage/cost monitoring are not verified launch features; any monitoring delivered must be backed by the selected provider APIs and implemented reporting.',
    platform: 'Augmented Enterprises remains our broader platform direction in development. The starting application uses agreed, supported capabilities from our proprietary tooling; it does not promise every planned platform feature.',
    linkLabel: 'Explore AI Solutions & Architecture', linkHref: '/ai-solutions',
  },
  approach: {
    eyebrow: 'START FOCUSED · EXPAND WITH PURPOSE', title: 'A clear scope. A working foundation. Room to grow.',
    description: 'Begin with the workflow that matters most. Define what is included, connect the right pieces, and expand as your business is ready.',
    stages: [
      ['DISCOVER', 'Understand your business, current website, applications, and most important workflow.'],
      ['DESIGN', 'Define the customer experience, business workspace, integration boundaries, and agreed implementation scope.'],
      ['BUILD & CONNECT', 'Build the customer and team experiences, connect the agreed supported systems, and configure the included assistant and operational workflow boundaries.'],
      ['LAUNCH & EXPAND', 'Validate the agreed workflow and assistant, deploy, document, provide basic administrator handoff, and identify sensible next steps.'],
    ],
  },
  closing: {
    title: 'Your business deserves more than a website.',
    description: "Let's turn your existing tools, customer interactions, and everyday workflows into a connected business experience.",
    preparation: "Tell us what your business does, what software you already use, and what you'd like to improve.",
  },
} as const satisfies CustomApplicationsContent;

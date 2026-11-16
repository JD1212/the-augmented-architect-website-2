/** Approved permanent editorial content. No publication dates or author metadata. */
export const approachIds = ['philosophy', 'ai-architecture', 'salesforce'] as const;
export type ApproachId = (typeof approachIds)[number];
export type EditorialVisual = 'foundation' | 'layers' | 'conversation' | 'salesforce';
export type EditorialSection = {
  id: string; title: string; paragraphs: readonly string[];
  visual?: EditorialVisual; kicker?: string; items?: readonly string[]; listAfterParagraph?: number;
};
export type ApproachPageContent = {
  label: string; eyebrow: string; title: string; introduction: readonly string[];
  sections: readonly EditorialSection[]; closing: string; seoDescription: string;
};
export const ourApproach = {
  title: 'Our Approach',
  introduction: 'How we think about business systems, AI, and Salesforce. These are the principles that guide our work: understand the business, make complexity manageable, and build foundations that can change.',
  seoDescription: 'Our approach to software architecture, practical AI, and Salesforce modernization. Start with the business and build systems that can evolve.',
  navigationLabel: 'Explore our approach', breadcrumbLabel: 'Breadcrumb',
  closingLabel: 'The principle',
} as const;
export function approachHref(id: ApproachId) { return `/our-approach/${id}`; }

export const approachPages = {
  "philosophy": {
    "label": "Our Philosophy",
    "eyebrow": "OUR APPROACH / OUR PHILOSOPHY",
    "title": "Good architecture makes everything else easier.",
    "introduction": [
      "Software should serve the business, not the other way around.",
      "I've spent years working with companies that have good people, capable software, and systems that have become unnecessarily complicated. Usually, the problem isn't that they chose the wrong technology. It's that the technology grew without a clear plan for how everything should work together.",
      "Another application gets added. Another integration is built. A workflow gets patched because something changed. Eventually, nobody has a complete picture of how the business operates across its systems.",
      "I believe there's a better way to build."
    ],
    "sections": [
      {
        "id": "philosophy-1",
        "title": "Start with the business.",
        "paragraphs": [
          "Before recommending a platform or writing code, I want to understand how the business actually operates.",
          "Who are your customers? How does work move through your organization? Where does information originate? Who needs access to it? Where are employees repeating the same work because two systems don't communicate?",
          "Those questions should determine the architecture.",
          "I'm not interested in selling a business technology simply because it's new. I want to build something that solves a real problem and makes the next problem easier to solve."
        ]
      },
      {
        "id": "philosophy-2",
        "title": "Build things that can change.",
        "paragraphs": [
          "Technology is evolving faster than at any point in my career.",
          "Something that takes weeks to develop today might take days six months from now. An entirely new AI runtime or development tool might change how we approach a problem next month.",
          "That's exciting, but it creates a challenge. If a company builds everything around one vendor, one framework, or one particular AI product, it can quickly find itself stuck.",
          "I prefer modular systems with clear responsibilities, structured data, well-defined interfaces, and sensible boundaries.",
          "You should be able to improve one part of your application without rebuilding the rest of it."
        ],
        "visual": "foundation"
      },
      {
        "id": "philosophy-3",
        "title": "Keep complexity where it belongs.",
        "paragraphs": [
          "Good architecture isn't about creating more layers, diagrams, or abstractions than a business needs.",
          "It's about making the complicated parts manageable.",
          "A small company doesn't need enterprise infrastructure for the sake of having enterprise infrastructure. But it does need to understand its data, control access to its systems, and avoid decisions that will become expensive to reverse.",
          "I like starting with something practical, getting it working, and giving it a foundation that can grow."
        ]
      },
      {
        "id": "philosophy-4",
        "title": "The goal is independence.",
        "paragraphs": [
          "The best system is one a business can understand, maintain, and continue improving.",
          "Your data should remain accessible. Your integrations should be understandable. Your software shouldn't become impossible to change because the original developer is gone.",
          "And as AI makes software development faster and more accessible, those architectural decisions become even more important."
        ]
      }
    ],
    "closing": "The code is becoming easier. The architecture is what makes it work.",
    "seoDescription": "Good architecture starts with the business. Our approach to modular systems, manageable complexity, and technology a business can understand and evolve."
  },
  "ai-architecture": {
    "label": "AI & Architecture",
    "eyebrow": "OUR APPROACH / AI & ARCHITECTURE",
    "title": "AI agents are getting easier to build. Making them work together is the challenge.",
    "introduction": [
      "There's no shortage of tools for building AI agents.",
      "You can create an agent, give it instructions, connect a few tools, and have something useful running surprisingly quickly.",
      "That's a significant change in software development. But it's also where I think businesses need to be careful.",
      "Building an agent and building an architecture for AI are two different things."
    ],
    "sections": [
      {
        "id": "ai-architecture-1",
        "title": "Understand the layers.",
        "paragraphs": [
          "When I talk with businesses about AI, I like to separate three things.",
          "**The intelligence.** This is the large language model. It understands language, reasons through problems, and helps decide what should happen next.",
          "**The execution.** This is the agent runtime. It manages the interaction with the model, invokes tools, handles execution, and coordinates the work.",
          "**The business architecture.** This determines what information the agent can access, which operations it can perform, whose identity and permissions apply, and how those actions are recorded.",
          "These layers are related, but they aren't interchangeable.",
          "A capable model doesn't automatically give an agent permission to access a customer's invoice. And choosing an agent runtime doesn't eliminate the need to manage credentials, business records, or authorization."
        ],
        "visual": "layers"
      },
      {
        "id": "ai-architecture-2",
        "title": "Don't build a collection of disconnected agents.",
        "paragraphs": [
          "Imagine a business with an agent inside its CRM, another helping with accounting, an AI assistant on its website, and several development agents working with its code.",
          "Each might be useful on its own.",
          "But who manages their access? Where do you see their activity and costs? How do they understand the same customer? What happens when one agent needs information from another business system?",
          "Those are architectural questions.",
          "I believe businesses should begin by organizing their identities, data, integrations, and authorized operations. Then they can introduce agents where they provide real value.",
          "That approach also gives businesses flexibility to use different AI models and runtimes as technology evolves."
        ]
      },
      {
        "id": "ai-architecture-3",
        "title": "The interface is changing, too.",
        "paragraphs": [
          "For decades, we've designed applications around navigation.",
          "Menus, dashboards, filters, forms, and pages all exist to help people find information and perform actions.",
          "But what happens when a customer can simply ask an application what they need?",
          "\"Tell me about your services.\"",
          "\"Show me examples.\"",
          "\"Do you have anything available on Friday?\"",
          "\"Book that appointment for me.\"",
          "The application can answer, retrieve relevant information, display the right interface when useful, and complete authorized actions.",
          "I call this a conversation-first approach.",
          "It doesn't mean every screen or dashboard disappears. Some information is better viewed visually. It means people shouldn't always have to learn how to navigate software before they can accomplish something."
        ],
        "visual": "conversation"
      },
      {
        "id": "ai-architecture-4",
        "title": "Build for what comes next.",
        "paragraphs": [
          "The models, frameworks, and development tools available today will continue changing.",
          "I don't think businesses should wait for everything to settle down. They should start building a foundation that allows them to benefit from those changes.",
          "Organize the business data. Define identities and permissions. Make integrations reusable. Give agents access to specific authorized tools rather than unrestricted systems. Make activity and usage visible where supported.",
          "Then, as better technology becomes available, the business is positioned to take advantage of it."
        ]
      }
    ],
    "closing": "The future isn't about having the most agents. It's about building a business that can actually use them.",
    "seoDescription": "The intelligence, execution, and business governance behind practical AI. Explore connected agents, authorized tools, and conversation-first applications."
  },
  "salesforce": {
    "label": "Salesforce",
    "eyebrow": "OUR APPROACH / SALESFORCE",
    "title": "Salesforce doesn't have to be this complicated.",
    "introduction": [
      "I've worked in Salesforce organizations where a developer can spend more time figuring out what the existing automation does than making the actual change.",
      "A record gets updated and nobody is completely sure which triggers, Flows, or other processes will execute. There's automation that hasn't been touched in years because everyone is afraid of breaking something.",
      "And for smaller organizations with a limited development team, that complexity can become a serious problem.",
      "I specialize in helping businesses get control of it."
    ],
    "sections": [
      {
        "id": "salesforce-1",
        "title": "I'm not against Flow.",
        "paragraphs": [
          "Salesforce's declarative tools have a place. Flows are useful, especially for straightforward processes that administrators can understand and maintain.",
          "But not every automation belongs in a visual editor.",
          "Long, complicated Flows with multiple branches, dependencies, and substantial business logic can become difficult to review, test, and maintain.",
          "And there's an important change happening in development.",
          "**AI has made writing code dramatically faster.**",
          "Tasks that once required hours of manual development can now be accelerated with AI-assisted coding tools. That changes the economics of choosing between declarative automation and well-structured Apex.",
          "When a complex process can be implemented, tested, and maintained more effectively in code, we should be willing to make that choice.",
          "The goal isn't more Apex. The goal is better architecture."
        ]
      },
      {
        "id": "salesforce-2",
        "title": "Make the automation visible.",
        "paragraphs": [
          "One of the biggest challenges in an older Salesforce organization is understanding what's already there.",
          "Which triggers run for an object? Which record-triggered Flows are active? What classes and services are involved? Where do dependencies exist?",
          "That's part of why I've been developing the Architecture Command Center and a structured Trigger Runtime.",
          "The Command Center helps developers inspect and understand an object's automation. The Trigger Runtime provides a more organized approach to executing and managing Apex trigger actions.",
          "And the VS Code extension connects that inspection process to the developer's actual workspace, helping them open relevant source and work with the appropriate project context.",
          "The idea is straightforward: understand what exists, organize the implementation, make controlled changes, and test them."
        ],
        "visual": "salesforce"
      },
      {
        "id": "salesforce-3",
        "title": "Make small teams more effective.",
        "paragraphs": [
          "I particularly enjoy working with companies that don't have a large internal Salesforce engineering department.",
          "Maybe you have one administrator and a developer. Maybe you work with an offshore team. Maybe outside consultants have contributed code over the years, and nobody has had time to organize it.",
          "You don't necessarily need to replace your team or launch a massive redevelopment project.",
          "You need standards, a clearer architecture, better visibility, and a development process that lets people make changes confidently.",
          "That means consistent trigger patterns, sensible separation of responsibilities, source control, tests, and documentation that people can actually use."
        ]
      },
      {
        "id": "salesforce-4",
        "title": "Modernize without starting over.",
        "paragraphs": [
          "I generally prefer an incremental approach.",
          "Start with an object that's causing problems. Understand the existing automation. Identify what's worth keeping and what should be reorganized. Make the changes in manageable pieces and validate them before moving on.",
          "The result should be a Salesforce organization that's easier for administrators, developers, and outside teams to understand.",
          "And as AI-assisted development becomes a bigger part of how software is maintained, a well-organized codebase becomes even more valuable."
        ]
      }
    ],
    "closing": "You don't need to rebuild your Salesforce org. You need to make it easier to work on.",
    "seoDescription": "A practical approach to Salesforce Flows, Apex, automation visibility, and incremental modernization that helps small teams make changes confidently."
  }
} as const satisfies Record<ApproachId, ApproachPageContent>;

export const aboutEditorial = {
  "title": "Building better business software starts with understanding the business.",
  "introduction": [
    "The Augmented Architect is an independent software architecture and development consultancy focused on connecting business systems, modernizing existing applications, and helping companies adopt AI in a practical way.",
    "We believe technology should make businesses easier to operate, not more complicated.",
    "Our approach combines hands-on development with business architecture, integration strategy, and a focus on software that can continue evolving as technology changes."
  ],
  "sections": [
    {
      "id": "about-1",
      "title": "Experience across different industries.",
      "paragraphs": [
        "The company is led by JD Burkholder, a solutions architect and software developer with experience working across large organizations and smaller businesses.",
        "I served as lead solutions architect and senior developer supporting Uber's global legal team, working on complex business systems and Salesforce solutions.",
        "I've also worked extensively with law firms, construction companies, and businesses across different industries, including projects involving Salesforce and ERP platforms such as Accounting Seed.",
        "One thing I've learned is that while every industry has its own products, services, and challenges, the fundamentals of running a business are remarkably similar. You're managing customers, people, processes, information, and the work that connects them.",
        "The technology may be different, but the underlying challenges are often the same: organizing information, connecting systems, improving workflows, and giving people the tools they need to do their jobs effectively.",
        "That's the perspective I bring to software architecture. Understand how the business operates first, then build the technology around it."
      ],
      "kicker": "Founder & Architect — JD Burkholder"
    },
    {
      "id": "about-2",
      "title": "Why we focus on smaller and mid-sized businesses.",
      "paragraphs": [
        "Some of the most rewarding work happens with companies that don't have large internal engineering departments.",
        "These businesses often have ambitious goals but limited technical resources. They may have a small development team, a Salesforce administrator handling too many responsibilities, or several software systems that don't communicate particularly well.",
        "They don't need somebody to make their technology more complicated.",
        "They need someone who can understand their business, explain the options, and build something practical.",
        "The Augmented Architect helps companies make better use of their existing people, systems, and development resources."
      ]
    },
    {
      "id": "about-3",
      "title": "Why AI changes the opportunity.",
      "paragraphs": [
        "AI is changing how quickly applications can be developed and how people interact with software.",
        "Small and mid-sized companies can now consider capabilities that previously required much larger technology budgets.",
        "But moving quickly without a foundation creates a different kind of problem.",
        "Our focus is on the architecture behind AI: how agents interact with applications, how systems are connected, how business information is organized, and how access and permissions are managed.",
        "We're especially interested in conversation-first applications, where people can describe what they need and the software helps carry it through to a real result.",
        "Scout, the AI assistant on this website, demonstrates part of that approach."
      ]
    },
    {
      "id": "about-4",
      "listAfterParagraph": 2,
      "title": "What we do.",
      "paragraphs": [
        "The Augmented Architect brings together experience in Salesforce, custom software development, business integrations, and modern AI architecture.",
        "Our work focuses on three areas:",
        "We believe companies should be able to improve their systems without rebuilding everything whenever a new technology becomes available.",
        "The goal is to create a foundation that can take advantage of what's next."
      ],
      "items": [
        "Salesforce modernization and maintainable automation.",
        "Connected business applications and integration architecture.",
        "Practical AI solutions, agent implementation, and business governance."
      ]
    },
    {
      "id": "about-5",
      "title": "Let's talk about your business.",
      "paragraphs": [
        "Whether you're dealing with a complicated Salesforce organization, disconnected software, or trying to figure out where AI fits into your company, we're happy to talk through the possibilities.",
        "We work directly with clients, from the initial architecture discussion through development and implementation."
      ]
    }
  ],
  "closing": "If you're looking for someone who understands both the business and the code, let's have a conversation.",
  "cta": "Book a free 30-minute consultation."
} as const;

export const editorialDiagrams = {
  foundation: {
    title: 'From fragmented systems to a connected foundation',
    before: 'Fragmented systems', after: 'A modular business foundation',
    disconnected: ['Applications', 'Business data', 'Identities', 'Integrations', 'Permissions'],
    connected: ['Shared business data', 'Defined identities', 'Reusable integrations', 'Modular applications', 'Clear permissions'],
    caption: 'Clear responsibilities and shared foundations make individual parts easier to improve.',
  },
  layers: {
    title: 'Three layers of AI',
    steps: [
      ['Intelligence', 'Large language model', 'Language, reasoning, and decisions'],
      ['Execution', 'Agent runtime, tools, and workflows', 'Coordinating and carrying out work'],
      ['Business governance', 'Identity, permissions, integrations, operations, and auditing', 'Defining and enforcing authorized access'],
    ],
    caption: 'Distinct responsibilities, working together. Intelligence does not replace authorization.',
  },
  conversation: {
    title: 'A conversation-first application',
    steps: ['Customer request', 'AI assistant', 'Authorized business tool', 'Business system', 'Useful result'],
    caption: 'Scout checks real calendar availability and schedules consultations through authorized tools, with explicit confirmation and ownership verification where required.',
  },
  salesforce: {
    title: 'A manageable modernization workflow',
    steps: ['Inspect automation', 'Open relevant source in VS Code', 'Modernize incrementally', 'Test and validate'],
    caption: 'Developer-led, controlled changes. Inspection supports understanding; it does not automatically clean up an org, convert Flows, or deploy changes.',
  },
} as const;

/** Concise approved source summaries for the existing Scout knowledge registry. */
export const editorialKnowledge = {
  approach: {
    title: ourApproach.title, href: '/our-approach',
    philosophy: { title: approachPages.philosophy.label, href: approachHref('philosophy'), summary: 'Software should serve the business. Start with how the business operates, then choose technology. Favor modular systems, structured data, clear interfaces, sensible permissions, manageable complexity, and technology the business can understand, maintain, and evolve.' },
    aiArchitecture: { title: approachPages['ai-architecture'].label, href: approachHref('ai-architecture'), summary: 'Distinguish intelligence (the model), execution (agent runtime and tools), and business governance (identity, permissions, integrations, operations, and auditing). Organize shared business context and authorized tools before adding disconnected agents. Conversation-first applications combine useful dialogue and visual interfaces; Scout consultation scheduling is a working example. Activity and usage visibility depends on implemented provider support.' },
    salesforce: { title: approachPages.salesforce.label, href: approachHref('salesforce'), summary: "Flows are useful for straightforward, administrator-maintainable processes. Complex branching and business logic may be easier to review, test, and maintain in well-structured Apex. AI-assisted coding changes development effort, but better architecture—not more Apex—is the goal. Architecture Command Center, Trigger Runtime, and the VS Code extension support inspection, organized trigger actions, opening relevant source, and incremental developer-led modernization. They do not promise automatic org cleanup, Flow conversion, or deployment." },
  },
  about: {
    title: 'About The Augmented Architect', href: '/about',
    summary: 'An independent software architecture and development consultancy connecting business systems, modernizing applications, and helping smaller and mid-sized companies adopt practical AI. Work spans Salesforce modernization, connected business applications and integration architecture, and practical AI implementation and governance. Clients work directly with the architect through discussion, development, and implementation.',
    founder: { name: 'JD Burkholder', role: 'Founder & Architect', experience: "Solutions architect and software developer. Served as lead solutions architect and senior developer supporting Uber's global legal team on complex business systems and Salesforce. Also worked with law firms, construction companies, and other businesses, including Salesforce and ERP platforms such as Accounting Seed." },
  },
} as const;

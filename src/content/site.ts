export type SiteLink = { label: string; href: string };
export type IconName = 'layers' | 'cloud' | 'bolt' | 'chart' | 'code' | 'data';
type DetailPage = { title: string; description: string; notice?: string };
type SiteContent = {
  name: string; brandLines: string[]; monogram: string; url: string;
  navigation: SiteLink[]; consultation: SiteLink;
  accessibility: { skip: string; navigation: string; menu: string; home: string };
  hero: { eyebrow: string; title: string; description: string; secondary: SiteLink; artworkLabel: string; aiLabel: string; systemLabels: string[] };
  services: { title: string; description: string; href: string; icon: IconName }[];
  value: { title: string; description: string; outcomes: { label: string; icon: IconName }[] };
  showcase: { title: string; description: string; cta: SiteLink; placeholder: string; previews: { eyebrow: string; title: string; description: string; menu: string[]; tiles: string[] }[] };
  footer: { eyebrow: string; title: string; colors: { name: string; hex: string }[] };
  pages: Record<'ai-solutions' | 'salesforce' | 'about' | 'contact' | 'book', DetailPage>;
  backHome: SiteLink;
  seo: Record<'home' | 'ai-solutions' | 'salesforce' | 'about' | 'contact' | 'book', { title: string; description: string }>;
};
export const site: SiteContent = {
  name: 'The Augmented Architect', brandLines: ['THE AUGMENTED', 'ARCHITECT'], monogram: 'AA',
  // Replace with the confirmed public origin before publishing.
  url: 'http://localhost:3000',
  navigation: [{ label: 'AI Solutions', href: '/ai-solutions' }, { label: 'Salesforce', href: '/salesforce' }, { label: 'Insights', href: '/insights' }, { label: 'About', href: '/about' }, { label: 'Contact', href: '/contact' }],
  consultation: { label: 'Book a Consultation', href: '/book' },
  accessibility: { skip: 'Skip to content', navigation: 'Main navigation', menu: 'Menu', home: 'The Augmented Architect home' },
  hero: { eyebrow: 'BUSINESS  •  SALESFORCE  •  AI AGENTS', title: 'Architecture for the AI future.', description: 'We build connected business systems, intelligent agents, and modern Salesforce foundations that help your team move faster, work smarter, and create lasting value.', secondary: { label: 'Explore Our Solutions', href: '/ai-solutions' }, artworkLabel: 'Artwork placeholder', aiLabel: 'AI', systemLabels: ['Salesforce', 'CRM & Sales', 'Workflows', 'Data & Integrations'] },
  services: [
    { title: 'Connected Business Systems', description: 'Build the foundation for AI-ready growth with integrations, workflows, and a unified customer context.', href: '/ai-solutions', icon: 'layers' },
    { title: 'Salesforce Modernization', description: "Clean up messy orgs, simplify flows and triggers, and prepare Salesforce for AI and what's next.", href: '/salesforce', icon: 'cloud' },
  ],
  value: { title: 'Turn technology into measurable business value.', description: 'We help organizations design and deliver practical, scalable solutions that connect people, data, and AI—so you can operate more efficiently, serve customers better, and grow with confidence.', outcomes: [{ label: 'Faster execution', icon: 'bolt' }, { label: 'More connected systems', icon: 'layers' }, { label: 'Lasting business impact', icon: 'chart' }] },
  showcase: { title: 'See the systems in action.', description: 'A closer look at the platforms and agent experiences we design, build, and integrate for our clients.', cta: { label: 'Explore a Demo', href: '/ai-solutions#demo' }, placeholder: 'Illustrative preview · Not a live product', previews: [
    { eyebrow: 'AI CONSULTANCY', title: 'AI Consultancy Strategy', description: 'Design, build, and operationalize AI across your business.', menu: ['Overview', 'Projects', 'Agents', 'Integrations', 'Settings'], tiles: ['Active Projects', 'Business Agents', 'Integrations'] },
    { eyebrow: 'YOUR BUSINESS WORKSPACE', title: 'Overview', description: 'A focused view of your business agents and their readiness.', menu: ['AGENT STUDIO', 'My Profile', 'My Team', 'Overview', 'Business Agents', 'Computers & Servers'], tiles: ['Build your augmented enterprise.'] },
  ] },
  footer: { eyebrow: 'OUR DESIGN PALETTE', title: 'A cohesive, enterprise-ready look.', colors: [{ name: 'Warm Ivory', hex: '#F5F2EA' }, { name: 'Graphite', hex: '#252B31' }, { name: 'Steel Blue', hex: '#597C9E' }, { name: 'Cool Gray', hex: '#E5E9ED' }, { name: 'Soft Charcoal', hex: '#535B64' }] },
  pages: {
    'ai-solutions': { title: 'Connected Business Systems', description: 'Build the foundation for AI-ready growth with integrations, workflows, and a unified customer context.', notice: 'These are illustrative design previews. A live product demo is not yet available.' },
    salesforce: { title: 'Salesforce Modernization', description: "Clean up messy orgs, simplify flows and triggers, and prepare Salesforce for AI and what's next." },
    about: { title: 'About The Augmented Architect', description: 'We help organizations design and deliver practical, scalable solutions that connect people, data, and AI—so you can operate more efficiently, serve customers better, and grow with confidence.' },
    contact: { title: 'Contact', description: 'We build connected business systems, intelligent agents, and modern Salesforce foundations that help your team move faster, work smarter, and create lasting value.', notice: 'Contact details will be added here. This initial website does not yet accept inquiries.' },
    book: { title: 'Book a Consultation', description: 'Turn technology into measurable business value.', notice: 'Consultation scheduling is not connected yet. Booking details will be added here; no appointment can be submitted through this initial website.' },
  },
  backHome: { label: 'Back to home', href: '/' },
  seo: {
    home: { title: 'Architecture for the AI future', description: 'Connected business systems, intelligent agents, and modern Salesforce foundations from The Augmented Architect.' },
    'ai-solutions': { title: 'AI Solutions', description: 'Build the foundation for AI-ready growth with connected business systems, integrations, and workflows.' },
    salesforce: { title: 'Salesforce Modernization', description: 'Simplify Salesforce flows and triggers and prepare your Salesforce foundations for AI.' },
    about: { title: 'About', description: 'Learn about The Augmented Architect and our approach to connecting people, data, and AI.' },
    contact: { title: 'Contact', description: 'Contact information for The Augmented Architect. Inquiry setup is coming soon.' },
    book: { title: 'Book a Consultation', description: 'Consultation information for The Augmented Architect. Online scheduling is not yet available.' },
  },
};

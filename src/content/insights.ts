export const categoryIds = ['philosophy', 'ai-architecture', 'salesforce'] as const;
export type ArticleCategory = (typeof categoryIds)[number];

type CategoryContent = {
  title: string;
  summary: string;
  introduction: string;
  seoDescription: string;
};
type PhilosophySection = { title: string; paragraphs: readonly string[] };
type InsightsContent = {
  title: string;
  introduction: string;
  seoDescription: string;
  categoryNavigationLabel: string;
  breadcrumbLabel: string;
  categories: Record<ArticleCategory, CategoryContent>;
  philosophy: { principle: string; sections: readonly PhilosophySection[] };
  articlesHeading: string;
  empty: { title: string; description: string };
  relatedHeading: string;
  backToInsights: string;
  backToCategory: string;
  publishedLabel: string;
  notFound: { title: string; description: string };
};

export const insights: InsightsContent = {
  title: 'Insights',
  introduction: 'Our perspective on business systems, architecture, and practical technology decisions—grounded in the belief that technology should serve the business and evolve with it.',
  seoDescription: 'Explore our philosophy and perspectives on AI, business architecture, and Salesforce, with practical technology decisions built around business needs.',
  categoryNavigationLabel: 'Insights categories',
  breadcrumbLabel: 'Breadcrumb',
  categories: {
    philosophy: {
      title: 'Our Philosophy',
      summary: 'The principles behind how we design business systems and choose technology.',
      introduction: 'We design technology foundations around the needs of a business, with the flexibility to evolve as its priorities and platforms change.',
      seoDescription: 'Build for change, not for a particular technology. Our technology-independent approach to modular systems, practical architecture, and responsible AI.',
    },
    'ai-architecture': {
      title: 'AI & Architecture',
      summary: 'AI agents, business integrations, modular systems, agent governance, scalability, and emerging technologies.',
      introduction: 'Perspectives on designing AI agents and business integrations within modular, scalable systems—with shared context, appropriate governance, and maintainability at the center.',
      seoDescription: 'Perspectives on AI agents, modular business systems, integrations, agent governance, scalability, and emerging technologies.',
    },
    salesforce: {
      title: 'Salesforce',
      summary: 'Salesforce architecture, modernization, custom development, automation, and integration strategies.',
      introduction: 'Practical perspectives on Salesforce architecture, modernization, custom development, automation, and integrations that support the wider business.',
      seoDescription: 'Explore practical Salesforce architecture, modernization, custom development, automation, and integration strategies.',
    },
  },
  philosophy: {
    principle: 'Build for change, not for a particular technology.',
    sections: [
      {
        title: 'A foundation that can evolve',
        paragraphs: ['Businesses need technology foundations that are modular, maintainable, and scalable. We design systems with clear responsibilities and connections so they can adapt as AI, software platforms, and business needs change.'],
      },
      {
        title: 'The right technology for the business',
        paragraphs: ['Our consulting approach is technology-independent. We can implement custom software, Salesforce solutions, n8n, Microsoft Copilot Studio, AI runtimes, and integrations between different systems.', 'We start with the business process and the outcome it needs. From there, we choose the right combination of technologies, rather than force a particular platform into every situation.'],
      },
      {
        title: 'AI within an overall architecture',
        paragraphs: ['AI agents should support business processes through shared context, clear responsibilities, and appropriate governance. We design for maintainability and oversight, so agents fit within a coherent architecture instead of becoming disconnected automations.'],
      },
    ],
  },
  articlesHeading: 'Articles',
  empty: { title: 'No articles published yet.', description: 'New perspectives will appear here as they are published.' },
  relatedHeading: 'Related articles',
  backToInsights: 'Back to Insights',
  backToCategory: 'Back to category',
  publishedLabel: 'Published',
  notFound: { title: 'Article not found', description: 'This article is not available. Explore our Insights categories for published perspectives.' },
};

export function categoryHref(category: ArticleCategory) {
  return `/insights/${category}`;
}

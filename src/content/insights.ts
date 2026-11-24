import { approachIds, approachPages, approachHref, ourApproach } from './editorial';

// Preserve the typed file-based article helpers. Public section names and URLs
// now describe Our Approach; the three permanent pages are not article feeds.
export const categoryIds = approachIds;
export type ArticleCategory = (typeof categoryIds)[number];
const summaries = {
  philosophy: 'The principles behind how we design business systems and choose technology.',
  'ai-architecture': 'AI agents, business integrations, modular systems, agent governance, scalability, and emerging technologies.',
  salesforce: 'Salesforce architecture, modernization, custom development, automation, and integration strategies.',
} as const;
const category = (id: ArticleCategory) => ({
  title: approachPages[id].label, summary: summaries[id],
  introduction: approachPages[id].introduction[0], seoDescription: approachPages[id].seoDescription,
});
export const insights = {
  title: ourApproach.title, introduction: ourApproach.introduction, seoDescription: ourApproach.seoDescription,
  categoryNavigationLabel: ourApproach.navigationLabel, breadcrumbLabel: ourApproach.breadcrumbLabel,
  categories: { philosophy: category('philosophy'), 'ai-architecture': category('ai-architecture'), salesforce: category('salesforce') },
  articlesHeading: 'Articles',
  empty: { title: 'No articles published yet.', description: 'New perspectives will appear here as they are published.' },
  relatedHeading: 'Related articles', backToInsights: 'Back to Our Approach', backToCategory: 'Back to Our Approach', publishedLabel: 'Published',
  notFound: { title: 'Page not found', description: 'This page is not available. Explore Our Approach to business systems, AI, and Salesforce.' },
} as const;
export const categoryHref = approachHref;


export const libraryContent = {
  title: 'Insights',
  eyebrow: 'PRACTICAL THINKING FOR CONNECTED BUSINESS',
  introduction: 'Technical guides and practical perspectives on AI, business applications, and Salesforce modernization. Built for the decisions behind reliable software.',
  seoDescription: 'Practical guides to AI integrations, agent governance, custom business applications, and Salesforce modernization from The Augmented Architect.',
  articles: 'Ideas you can put to work',
  back: 'All insights →',
  topics: 'Explore our thinking',
  empty: 'Our first guides are being prepared. Explore Our Approach while the library grows.',
} as const;

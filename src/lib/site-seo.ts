import type { Metadata } from 'next';
import { site } from '@/content/site';
import { aiSolutions } from '@/content/ai-solutions';
import { customApplications } from '@/content/custom-applications';

export const shareImage = {
  url: new URL('/opengraph-image', site.url).href,
  width: 1200,
  height: 630,
  alt: `${site.name} — ${site.hero.title}`,
};

export function isNonProduction(env: NodeJS.ProcessEnv = process.env) {
  return env.VERCEL_ENV === 'preview' || env.VERCEL_ENV === 'development' || env.NODE_ENV === 'development';
}

export function indexingMetadata(env: NodeJS.ProcessEnv = process.env): Metadata {
  const verification = env.GOOGLE_SITE_VERIFICATION?.trim();
  return {
    robots: { index: !isNonProduction(env), follow: !isNonProduction(env) },
    ...(!isNonProduction(env) && verification ? { verification: { google: verification } } : {}),
  };
}

export function businessStructuredData() {
  const organization = `${site.url}/#organization`;
  const services = [
    { path: '/ai-solutions', name: 'AI Solutions and Architecture', description: aiSolutions.seo.description },
    { path: '/salesforce', name: 'Salesforce Modernization', description: site.seo.salesforce.description },
    { path: '/custom-applications', name: 'Custom Business Applications', description: customApplications.seo.description },
  ];
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': organization, name: site.name, url: site.url,
        logo: new URL('/apple-icon.png', site.url).href, description: site.seo.home.description },
      { '@type': 'WebSite', '@id': `${site.url}/#website`, name: site.name, url: site.url,
        publisher: { '@id': organization }, inLanguage: 'en' },
      ...services.map(service => ({ '@type': 'Service', '@id': `${site.url}${service.path}#service`,
        name: service.name, description: service.description, url: new URL(service.path, site.url).href,
        provider: { '@id': organization } })),
    ],
  };
}

export function serializeStructuredData(data: unknown) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

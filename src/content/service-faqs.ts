import { aiSolutionsFaq } from './ai-solutions';
import { salesforceFaq, salesforceOffering } from './salesforce';
import { customApplications } from './custom-applications';
import { site } from './site';
import type { ServiceFaqCopy } from './faq-types';
import type { SiteLink } from './site';

export const serviceFaqLauncherCopy = { label: 'Questions?' } as const;
export type ServiceFaqRoute = '/ai-solutions' | '/salesforce' | '/custom-applications';

export const serviceFaqs = {
  '/ai-solutions': {
    content: aiSolutionsFaq,
    accessibleLabel: 'Questions? Read answers about AI for your business',
    consultation: site.consultation,
  },
  '/salesforce': {
    content: salesforceFaq,
    accessibleLabel: 'Questions? Read answers about Salesforce modernization',
    consultation: { label: salesforceOffering.hero.cta, href: site.consultation.href },
  },
  '/custom-applications': {
    content: customApplications.faq,
    accessibleLabel: 'Questions? Read answers about Custom Business Applications',
    consultation: { label: customApplications.hero.cta, href: site.consultation.href },
  },
} as const satisfies Record<ServiceFaqRoute, { content: ServiceFaqCopy; accessibleLabel: string; consultation: SiteLink }>;

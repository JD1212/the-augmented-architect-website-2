import { serviceFaqs, serviceFaqLauncherCopy, type ServiceFaqRoute } from '@/content/service-faqs';
import { FloatingServiceFaq } from './floating-service-faq';

// Mount only in the three service routes; send only that route's FAQ to the client.
export function ServiceFaq({ route }: { route: ServiceFaqRoute }) {
  return <FloatingServiceFaq key={route} idPrefix={`service-faq-${route.slice(1)}`} {...serviceFaqs[route]} label={serviceFaqLauncherCopy.label} />;
}

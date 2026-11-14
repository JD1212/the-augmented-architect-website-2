import { ServiceFaq } from '@/components/service-faq/service-faq';
import { CustomApplicationsPage } from '@/components/custom-applications/custom-applications-page';
import { customApplications } from '@/content/custom-applications';
import { createPageMetadata } from '@/lib/metadata';

export const metadata = createPageMetadata(customApplications.seo, customApplications.href);

export default function Page() { return <><CustomApplicationsPage /><ServiceFaq route="/custom-applications" /></>; }

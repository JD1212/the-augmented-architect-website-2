import { ServiceFaq } from '@/components/service-faq/service-faq';
import { SalesforcePage } from '@/components/salesforce/salesforce-page';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata('salesforce', '/salesforce');

export default function Page() { return <><SalesforcePage /><ServiceFaq route="/salesforce" /></>; }

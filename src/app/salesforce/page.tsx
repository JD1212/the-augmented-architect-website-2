import { ServicePage } from '@/components/service-page';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata('salesforce', '/salesforce');

export default function Page() { return <ServicePage slug="salesforce" />; }

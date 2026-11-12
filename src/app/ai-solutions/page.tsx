import { ServicePage } from '@/components/service-page';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata('ai-solutions', '/ai-solutions');

export default function Page() { return <ServicePage slug="ai-solutions" />; }

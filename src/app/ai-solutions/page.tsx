import { DetailPage } from '@/components/detail-page';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata('ai-solutions', '/ai-solutions');

export default function Page() { return <DetailPage slug="ai-solutions" />; }

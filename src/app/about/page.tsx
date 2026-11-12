import { DetailPage } from '@/components/detail-page';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata('about', '/about');

export default function Page() { return <DetailPage slug="about" />; }

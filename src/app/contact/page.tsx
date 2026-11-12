import { DetailPage } from '@/components/detail-page';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata('contact', '/contact');

export default function Page() { return <DetailPage slug="contact" />; }

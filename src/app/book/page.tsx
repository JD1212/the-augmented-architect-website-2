import { DetailPage } from '@/components/detail-page';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata('book', '/book');

export default function Page() { return <DetailPage slug="book" />; }

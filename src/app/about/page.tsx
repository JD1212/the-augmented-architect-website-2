import { AboutPage } from '@/components/editorial/about-page';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata('about', '/about');

export default function Page() { return <AboutPage />; }

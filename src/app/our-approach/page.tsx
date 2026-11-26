import { ApproachPage } from '@/components/editorial/approach-page';
import { insights } from '@/content/insights';
import { createPageMetadata } from '@/lib/metadata';

export const metadata = createPageMetadata({ title: insights.title, description: insights.seoDescription }, '/our-approach');

export default function OurApproachPage() { return <ApproachPage id="philosophy" />; }

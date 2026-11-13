import { AiSolutionsPage } from '@/components/ai-solutions/ai-solutions-page';
import { aiSolutions } from '@/content/ai-solutions';
import { createPageMetadata } from '@/lib/metadata';

export const metadata = createPageMetadata(aiSolutions.seo, '/ai-solutions');

export default function Page() { return <AiSolutionsPage />; }

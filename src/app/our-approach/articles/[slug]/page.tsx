import { permanentRedirect } from 'next/navigation';

export default async function LegacyArticle({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params;
  permanentRedirect('/insights/articles/'+encodeURIComponent(slug));
}

export {generateStaticParams} from '../../../insights/articles/[slug]/page';

import { Hero } from '@/components/hero';
import { Services } from '@/components/services';
import { BusinessValue } from '@/components/business-value';
import { ProductShowcase } from '@/components/product-showcase';
import { pageMetadata } from '@/lib/metadata';
export const metadata = pageMetadata('home', '/');
export default function Home() {
  return <main id="main"><Hero /><Services /><BusinessValue /><ProductShowcase /></main>;
}

import { SalesforcePage } from '@/components/salesforce/salesforce-page';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata('salesforce', '/salesforce');

export default function Page() { return <SalesforcePage />; }

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { ownerAuth, requireOwner } from '@/lib/marketing/auth';
import { MarketingError } from '@/lib/marketing/config';
import { MarketingDashboardView } from '@/components/marketing/dashboard';

async function OwnerDashboard() {
  let owner;
  try { owner = await requireOwner(await ownerAuth()); }
  catch(error) {
    if (error instanceof MarketingError && [401,403].includes(error.status)) redirect('/admin/login');
    return <div className="container"><h1>Owner portal unavailable</h1><p>Complete the owner authentication configuration before accessing marketing reports.</p><a href="/admin/login">Owner sign in</a></div>;
  }
  return <MarketingDashboardView email={owner.user.email ?? 'Owner'} />;
}
export default function MarketingPage() { return <Suspense fallback={<p className="container" role="status">Verifying owner access…</p>}><OwnerDashboard /></Suspense>; }

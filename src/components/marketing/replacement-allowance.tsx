'use client';

import {useRef, useState} from 'react';
import styles from './marketing.module.css';

/** Mount only for an approved plan's blocked allowance. No provider calls occur here. */
export function ReplacementAllowance({planId, maximumRequests, maximumCostUsd, disabled, onAuthorized}: {
  planId: string;
  maximumRequests: number;
  maximumCostUsd: number;
  disabled: boolean;
  onAuthorized: () => Promise<void>;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const inflight = useRef(false);
  const requestId = useRef<string | null>(null);
  const valid = Number.isInteger(maximumRequests) && maximumRequests > 0 && maximumRequests <= 10 && Number.isFinite(maximumCostUsd) && maximumCostUsd > 0 && maximumCostUsd <= 1;
  const quote = `${maximumRequests} requests / $${maximumCostUsd.toFixed(3)}`;

  async function authorize() {
    if (!confirmed || !valid || disabled || saved || inflight.current) return;
    inflight.current = true;
    setBusy(true);
    setError('');
    // Retain this ID after an uncertain response so an explicit retry is idempotent.
    requestId.current ??= crypto.randomUUID();
    try {
      const response = await fetch('/api/admin/marketing/research-plans', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({operation: 'authorizeResearch', planId, requestId: requestId.current, maximumRequests, maximumCostUsd, spendingConfirmed: true}),
      });
      if (!response.ok) throw Error('Replacement allowance was not confirmed. Refresh to check its status before trying again.');
      setSaved(true);
      setConfirmed(false);
      await onAuthorized();
    } catch {
      setError('Replacement allowance was not confirmed. Refresh to check its status before trying again.');
    } finally {
      inflight.current = false;
      setBusy(false);
    }
  }

  return <div>
    <p>New allowance: <strong>{quote}</strong></p>
    <p className={styles.note}>The original failed request and its reservation remain unchanged. No research will run automatically.</p>
    <label><input type="checkbox" style={{width: 'auto'}} checked={confirmed} disabled={disabled || busy || saved || !valid} onChange={event => setConfirmed(event.target.checked)}/> I authorize a separate replacement allowance of {quote} for this approved plan.</label>
    <div className={styles.seoControls}><button type="button" className={styles.secondary} disabled={!confirmed || !valid || disabled || busy || saved} onClick={() => void authorize()}>{busy ? 'Authorizing…' : 'Authorize replacement allowance'}</button></div>
    {saved && <p role="status">Replacement allowance authorized. Refresh if the remaining requests have not updated.</p>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
  </div>;
}

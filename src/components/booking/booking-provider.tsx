'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { BookingDialog } from './booking-dialog';
type ScoutOpener = (trigger: HTMLElement | null) => void;
type BookingActions = { openScout: () => void; openManual: () => void; registerScout: (opener: ScoutOpener) => () => void };
const BookingContext = createContext<BookingActions | null>(null);
function useBookingActions() {
  const actions = useContext(BookingContext);
  if (!actions) throw new Error('BookingProvider is required');
  return actions;
}
/** All existing consultation actions now enter Scout; the manual form remains explicit. */
export function useBooking() { return useBookingActions().openScout; }
export function useManualBooking() { return useBookingActions().openManual; }
export function useScoutBookingRegistration() { return useBookingActions().registerScout; }
export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [open,setOpen] = useState(false);
  const trigger = useRef<HTMLElement | null>(null);
  const scout = useRef<ScoutOpener | null>(null), queued = useRef(false);
  const openScout = useCallback(() => {
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (scout.current) scout.current(trigger.current); else queued.current = true;
  }, []);
  const openManual = useCallback(() => {
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(true);
  }, []);
  const registerScout = useCallback((opener: ScoutOpener) => {
    scout.current = opener;
    if (queued.current) { queued.current = false; opener(trigger.current); }
    return () => { if (scout.current === opener) scout.current = null; };
  }, []);
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !(event.target instanceof Element)) return;
      const anchor=event.target.closest('a[href]');if(!(anchor instanceof HTMLAnchorElement) || anchor.target === '_blank' || anchor.hasAttribute('download'))return;
      const url=new URL(anchor.href);if(url.origin!==location.origin || url.pathname!=='/book' || url.search || url.hash)return;
      // Keep genuine links for modified clicks and the direct /book fallback page.
      event.preventDefault();
      if (scout.current) scout.current(anchor); else { trigger.current=anchor;queued.current=true; }
    }
    document.addEventListener('click',onClick,true);return()=>document.removeEventListener('click',onClick,true);
  },[]);
  function hide() {
    setOpen(false);
    const target=trigger.current;
    if(target?.isConnected&&target.getClientRects().length)target.focus({preventScroll:true});
    else {
      const menu=document.querySelector<HTMLButtonElement>('.menu-toggle');
      if(menu?.getClientRects().length)menu.focus({preventScroll:true});
    }
  }
  return <BookingContext.Provider value={{openScout,openManual,registerScout}}>{children}<BookingDialog open={open} onClose={hide} /></BookingContext.Provider>;
}

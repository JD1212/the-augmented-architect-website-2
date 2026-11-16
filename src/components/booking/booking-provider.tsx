'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { BookingDialog } from './booking-dialog';
const BookingContext = createContext<(() => void) | null>(null);
export function useBooking() {
  const open = useContext(BookingContext);
  if (!open) throw new Error('BookingProvider is required');
  return open;
}
export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [open,setOpen] = useState(false);
  const trigger = useRef<HTMLElement | null>(null);
  function show() { trigger.current=document.activeElement instanceof HTMLElement ? document.activeElement : null;setOpen(true); }
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !(event.target instanceof Element)) return;
      const anchor=event.target.closest('a[href]');if(!(anchor instanceof HTMLAnchorElement) || anchor.target === '_blank' || anchor.hasAttribute('download'))return;
      const url=new URL(anchor.href);if(url.origin!==location.origin || url.pathname!=='/book' || url.search || url.hash)return;
      // Keep real /book links for keyboard, modified clicks, and no-JS fallback.
      event.preventDefault();trigger.current=anchor;setOpen(true);
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
  return <BookingContext.Provider value={show}>{children}<BookingDialog open={open} onClose={hide} /></BookingContext.Provider>;
}

'use client';
import { bookingCopy } from '@/content/booking';
import { useBooking } from './booking-provider';
export function BookPage() {
  const open=useBooking();
  return <main id="main"><section className="section inquiry-section"><div className="container inquiry-grid"><div className="inquiry-heading"><p className="eyebrow">Consultation</p><h1>{bookingCopy.title}</h1><p className="hero-description">{bookingCopy.introduction}</p><button type="button" className="button" onClick={open}>{bookingCopy.open}</button></div></div></section></main>;
}

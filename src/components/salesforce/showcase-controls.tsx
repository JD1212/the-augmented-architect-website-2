'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { captureAssets, showcaseCopy, type CaptureAsset, type ProductVariant, type SurfaceId } from '@/content/salesforce-showcase';
import { ProductInterface } from './product-interfaces';
import styles from './showcase.module.css';

export function ViewTabs({ items, value, onChange, label, prefix }: { items: readonly { id: string; title: string }[]; value: string; onChange: (id: string) => void; label: string; prefix: string }) {
  return <div role="tablist" aria-label={label} className={styles.tabs}>{items.map((item,index)=><button key={item.id} id={`${prefix}-tab-${item.id}`} role="tab" type="button" aria-selected={value===item.id} tabIndex={value===item.id?0:-1} aria-controls={value===item.id?`${prefix}-panel-${item.id}`:undefined} onClick={()=>onChange(item.id)} onKeyDown={event=>{
    let next=index;if(event.key==='ArrowRight')next=(index+1)%items.length;else if(event.key==='ArrowLeft')next=(index-1+items.length)%items.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=items.length-1;else return;
    event.preventDefault();onChange(items[next].id);document.getElementById(`${prefix}-tab-${items[next].id}`)?.focus();
  }}>{item.title}</button>)}</div>;
}

function ExpandedView({ title, asset, surface, notice, triggerRef, onClose }: { title: string; asset: CaptureAsset; surface?: SurfaceId; notice: string; triggerRef: RefObject<HTMLButtonElement|null>; onClose: ()=>void }) {
  const dialogRef=useRef<HTMLDialogElement>(null),closeRef=useRef<HTMLButtonElement>(null);
  const [actualSize,setActualSize]=useState(true);
  useEffect(()=>{const dialog=dialogRef.current,trigger=triggerRef.current;dialog?.showModal();closeRef.current?.focus({preventScroll:true});return()=>{dialog?.close();trigger?.focus({preventScroll:true});};},[triggerRef]);
  return <dialog ref={dialogRef} data-product-dialog className={styles.dialog} aria-labelledby="product-expand-title" aria-describedby="product-expand-description" onCancel={event=>{event.preventDefault();onClose();}} onKeyDown={event=>{
    if(event.key!=='Tab')return;const controls=event.currentTarget.querySelectorAll<HTMLElement>('button,[tabindex="0"]');const first=controls[0],last=controls[controls.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }} onClick={event=>{if(event.target!==event.currentTarget)return;const r=event.currentTarget.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)onClose();}}>
    <header className={styles.dialogHeader}><div><p id="product-expand-description">{notice}</p><h2 id="product-expand-title">{title}</h2></div><button type="button" ref={closeRef} aria-label={showcaseCopy.close} onClick={onClose}>×</button></header>
    {!surface&&<div className={styles.imageTools}><button type="button" aria-pressed={!actualSize} onClick={()=>setActualSize(false)}>{showcaseCopy.fit}</button><button type="button" aria-pressed={actualSize} onClick={()=>setActualSize(true)}>{showcaseCopy.actualSize}</button><span>{asset.width} × {asset.height}</span></div>}
    <div className={styles.expandCanvas} tabIndex={0} role="region" aria-label="Expanded product view; scroll to inspect">{surface?<ProductInterface id={surface} />:<Image {...asset} alt={asset.alt} unoptimized className={actualSize?styles.actualImage:styles.fitImage} />}</div>
  </dialog>;
}

export function ProductFrame({ variant }: { variant: ProductVariant }) {
  const [expanded,setExpanded]=useState<'interface'|'capture'|null>(null);
  const triggerRef=useRef<HTMLButtonElement|null>(null);
  const actual=variant.id==='dependencies';
  return <>
    <p className={styles.provenance}>{actual?showcaseCopy.actual:showcaseCopy.reconstruction}</p>
    <div className={styles.viewport} tabIndex={0} role="region" aria-label={`${variant.title}; scroll to inspect`}><ProductInterface id={variant.id} /></div>
    <div className={styles.toolbar}><p>{showcaseCopy.scrollHint}</p><div><button type="button" aria-haspopup="dialog" onClick={event=>{triggerRef.current=event.currentTarget;setExpanded('interface');}}>{showcaseCopy.expand} ↗</button><button type="button" aria-haspopup="dialog" onClick={event=>{triggerRef.current=event.currentTarget;setExpanded('capture');}}>{showcaseCopy.actualCapture} ↗</button></div></div>
    {!actual&&<p className={styles.readOnly}>{showcaseCopy.readOnly}</p>}
    {expanded&&<ExpandedView title={variant.title} asset={captureAssets[variant.asset]} surface={expanded==='interface'?variant.id:undefined} notice={expanded==='capture'||actual?showcaseCopy.actual:showcaseCopy.reconstruction} triggerRef={triggerRef} onClose={()=>setExpanded(null)} />}
  </>;
}

/** Real-capture entry point to the existing fit/native-size viewer. */
export function CaptureImage({ asset, title, notice, className, imageClassName, hint }: { asset: CaptureAsset; title: string; notice: string; className: string; imageClassName: string; hint: string }) {
  const [expanded,setExpanded]=useState(false);
  const triggerRef=useRef<HTMLButtonElement|null>(null);
  return <>
    <button type="button" ref={triggerRef} className={className} data-capture-image={asset.src} aria-label={`${hint}: ${title}`} aria-haspopup="dialog" aria-expanded={expanded} onClick={()=>setExpanded(true)}>
      <Image {...asset} alt={asset.alt} sizes="(max-width: 800px) 100vw, 1248px" className={imageClassName} />
      <span>{hint} <span aria-hidden="true">↗</span></span>
    </button>
    {expanded&&<ExpandedView title={title} asset={asset} notice={notice} triggerRef={triggerRef} onClose={()=>setExpanded(false)} />}
  </>;
}

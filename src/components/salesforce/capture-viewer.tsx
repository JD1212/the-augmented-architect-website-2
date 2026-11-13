'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { salesforceCaptures } from '@/content/salesforce';
import styles from './salesforce.module.css';

export function CaptureViewer() {
  const [selected, setSelected] = useState(salesforceCaptures[0]);
  const [zoom, setZoom] = useState(100);
  const dialog = useRef<HTMLDialogElement>(null);
  const openButton = useRef<HTMLButtonElement>(null);
  const image = selected.image;
  function close() { dialog.current?.close(); openButton.current?.focus(); }
  return <div className={styles.viewer}>
    <div className={styles.captureChoices} role="group" aria-label="Application views">
      {salesforceCaptures.map(capture => <button key={capture.id} type="button" aria-pressed={capture.id === selected.id} onClick={() => { setSelected(capture); setZoom(100); }}>{capture.title}</button>)}
    </div>
    <div className={styles.captureCaption} aria-live="polite"><h3>{selected.title}</h3><p>{selected.description}</p></div>
    {image ? <>
      <div className={styles.scrollPanel} tabIndex={0} role="region" aria-label={selected.title + ' screenshot; scroll to inspect'}>
        <Image src={image.src} alt={image.alt} width={image.width} height={image.height} className={styles.captureImage} sizes="(max-width: 800px) 1200px, 1248px" />
      </div>
      <button ref={openButton} className={styles.expand} type="button" onClick={() => { setZoom(100); dialog.current?.showModal(); }}>Expand screenshot</button>
      <dialog ref={dialog} className={styles.dialog} aria-labelledby="salesforce-capture-title" onCancel={event => { event.preventDefault(); close(); }}>
        <header><h3 id="salesforce-capture-title">{selected.title}</h3><button type="button" onClick={close} autoFocus>Close</button></header>
        <label className={styles.zoom}>Image size <input type="range" min="50" max="200" step="25" value={zoom} onChange={event => setZoom(Number(event.target.value))} /> {zoom}%</label>
        <div className={styles.expandedPanel} tabIndex={0} role="region" aria-label="Expanded screenshot; scroll horizontally and vertically">
          <Image src={image.src} alt={image.alt} width={image.width} height={image.height} unoptimized style={{ width: image.width * zoom / 100, maxWidth: 'none', height: 'auto' }} />
        </div>
      </dialog>
    </> : <div className={styles.pending}><span className={styles.captureTag}>REAL APPLICATION CAPTURE PENDING</span><p>Explore the architecture with us.</p><p>We are preparing a public-safe capture of this application view. No simulated dashboard is shown here.</p><details><summary>Planned view</summary><p>{selected.capture}</p></details></div>}
    <p className={styles.viewerNote}>Application images retain their original colors. When available, scroll to inspect or expand for zoom controls. Mobile browser zoom remains available.</p>
  </div>;
}


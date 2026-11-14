'use client';

import { useState } from 'react';
import { productViews, showcaseCopy } from '@/content/salesforce-showcase';
import { ProductFrame, ViewTabs } from './showcase-controls';
import styles from './showcase.module.css';

export function CaptureViewer() {
  const [selectedId,setSelectedId]=useState(productViews[0].id);
  const [variantId,setVariantId]=useState<string>(productViews[0].variants[0].id);
  const selected=productViews.find(view=>view.id===selectedId)!;
  const variant=selected.variants.find(view=>view.id===variantId)??selected.variants[0];
  return <div id="salesforce-product-showcase" className={styles.showcase}>
    <div className={styles.introduction}><h3>{showcaseCopy.title}</h3><p>{showcaseCopy.description}</p></div>
    <ViewTabs items={productViews} value={selectedId} onChange={id=>{const view=productViews.find(v=>v.id===id)!;setSelectedId(view.id);setVariantId(view.variants[0].id);}} label="Salesforce product views" prefix="sf-product" />
    <div role="tabpanel" id={`sf-product-panel-${selected.id}`} aria-labelledby={`sf-product-tab-${selected.id}`} className={styles.productPanel}>
      <div className={styles.caption} aria-live="polite"><h3>{selected.title}</h3><p>{selected.description}</p></div>
      {selected.variants.length>1&&<ViewTabs items={selected.variants} value={variant.id} onChange={setVariantId} label={`${selected.title} views`} prefix="sf-variant" />}
      <div role={selected.variants.length>1?'tabpanel':undefined} id={`sf-variant-panel-${variant.id}`} aria-labelledby={selected.variants.length>1?`sf-variant-tab-${variant.id}`:undefined}>
        <ProductFrame key={`${selected.id}-${variant.id}`} variant={variant} />
      </div>
      {selected.limitation&&<p className={styles.limitation}>{selected.limitation}</p>}
    </div>
  </div>;
}

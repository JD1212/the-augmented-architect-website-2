'use client';

import { useState } from 'react';
import { walkthroughSteps, showcaseCopy } from '@/content/salesforce-showcase';
import { ProductFrame, ViewTabs } from './showcase-controls';
import styles from './showcase.module.css';

export function TriggerWalkthrough() {
  const [step,setStep]=useState(0),[variantIndex,setVariantIndex]=useState(0);
  const current=walkthroughSteps[step],variant=current.variants[variantIndex]??current.variants[0];
  function go(next:number){setStep(next);setVariantIndex(0);}
  return <section id="create-trigger-action" className={styles.walkthrough} aria-labelledby="trigger-walkthrough-heading">
    <div className={styles.walkthroughHeading}><p className="eyebrow">{showcaseCopy.walkthroughEyebrow}</p><h3 id="trigger-walkthrough-heading">{showcaseCopy.walkthroughTitle}</h3><p>{showcaseCopy.walkthroughDescription}</p></div>
    <nav className={styles.steps} aria-label="Create Trigger Action walkthrough steps">{walkthroughSteps.map((item,index)=><button type="button" key={item.title} aria-current={step===index?'step':undefined} onClick={()=>go(index)}><span>{String(index+1).padStart(2,'0')}</span>{item.title}</button>)}</nav>
    <div className={styles.stepCaption} aria-live="polite"><p className={styles.stepCounter}>{showcaseCopy.step} {step+1} {showcaseCopy.of} {walkthroughSteps.length}</p><h4>{current.title}</h4><p>{current.description}</p></div>
    {current.variants.length>1&&<ViewTabs items={current.variants} value={variant.id} onChange={id=>setVariantIndex(current.variants.findIndex(v=>v.id===id))} label="Walkthrough capture stages" prefix="sf-walkthrough-variant" />}
    <div role={current.variants.length>1?'tabpanel':undefined} id={`sf-walkthrough-variant-panel-${variant.id}`} aria-labelledby={current.variants.length>1?`sf-walkthrough-variant-tab-${variant.id}`:undefined}><ProductFrame key={`${step}-${variant.id}`} variant={variant} /></div>
    {'note' in current&&<p className={styles.limitation}>{current.note}</p>}
    <div className={styles.stepNavigation}><button type="button" onClick={()=>go(step-1)} disabled={step===0}>← {showcaseCopy.previous}</button><span>{showcaseCopy.step} {step+1} {showcaseCopy.of} {walkthroughSteps.length}</span><button type="button" onClick={()=>go(step+1)} disabled={step===walkthroughSteps.length-1}>{showcaseCopy.next} →</button></div>
  </section>;
}

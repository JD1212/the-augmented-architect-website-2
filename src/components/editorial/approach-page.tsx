import { approachIds, approachHref, approachPages, ourApproach, type ApproachId } from '@/content/editorial';
import { ApproachTabs } from './approach-tabs';
import { EditorialParagraph, EditorialSections } from './editorial-sections';
import styles from './editorial.module.css';

export function ApproachPage({ id }: { id: ApproachId }) {
  return <ApproachTabs initialId={id} tabs={approachIds.map(key=>({id:key,label:approachPages[key].label,href:approachHref(key)}))} panels={approachIds.map(key=><ApproachContent key={key} id={key}/>)} />;
}
function ApproachContent({id}:{id:ApproachId}) {
  const page=approachPages[id];
  return <article>
      <header className={styles.pageHeader}><div><p className="eyebrow">{page.eyebrow}</p><h1>{page.title}</h1></div><div className={styles.introduction}>{page.introduction.map(paragraph => <EditorialParagraph key={paragraph} text={paragraph} />)}</div></header>
      <EditorialSections sections={page.sections} />
      <footer className={styles.closing}><p className="eyebrow">{ourApproach.closingLabel}</p><p>{page.closing}</p></footer>
    </article>;
}

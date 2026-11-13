import type { AssistantMessageData } from '@/content/assistant';
import styles from './assistant.module.css';

export function AssistantMessage({ message, visibleCharacters }: { message: AssistantMessageData; visibleCharacters?: number }) {
  const typing = visibleCharacters !== undefined && visibleCharacters < message.content.length;
  return <div className={styles.message} data-message-role={message.role}>
    {visibleCharacters === undefined ? <p>{message.content}</p> : <>
      <p className={styles.srOnly}>{message.content}</p>
      <p aria-hidden="true">{message.content.slice(0, visibleCharacters)}{typing && <span className={styles.cursor} />}</p>
    </>}
  </div>;
}

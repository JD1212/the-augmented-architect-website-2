import { assistantContent, type AssistantMessageData } from '@/content/assistant';
import styles from './assistant.module.css';

export function AssistantMessage({ message, visibleCharacters, conversation = false }: { message: AssistantMessageData; visibleCharacters?: number; conversation?: boolean }) {
  const typing = visibleCharacters !== undefined && visibleCharacters < message.content.length;
  return <div className={`${styles.message} ${conversation ? styles.chatMessage : ''}`} data-message-role={message.role}>
    {conversation && <span className={styles.srOnly}>{assistantContent.senderLabels[message.role]}: </span>}
    {visibleCharacters === undefined ? <p>{message.content}</p> : <>
      <p className={styles.srOnly}>{message.content}</p>
      <p aria-hidden="true">{message.content.slice(0, visibleCharacters)}{typing && <span className={styles.cursor} />}</p>
    </>}
  </div>;
}

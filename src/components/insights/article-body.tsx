import type { ArticleBlock } from '@/content/articles/types';

export function ArticleBody({ blocks }: { blocks: readonly ArticleBlock[] }) {
  return <div className="insights-article-body">{blocks.map((block, index) => {
    switch (block.type) {
      case 'paragraph': return <p key={index}>{block.text}</p>;
      case 'heading': return <h2 key={index}>{block.text}</h2>;
      case 'quote': return <blockquote key={index}><p>{block.text}</p></blockquote>;
      case 'list': {
        const List = block.ordered ? 'ol' : 'ul';
        return <List key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</List>;
      }
    }
  })}</div>;
}

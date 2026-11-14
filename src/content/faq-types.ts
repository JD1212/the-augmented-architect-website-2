export type ServiceFaqCopy = {
  title: string;
  introduction: string;
  closeLabel: string;
  scrollLabel: string;
  items: readonly { question: string; paragraphs: readonly string[] }[];
};

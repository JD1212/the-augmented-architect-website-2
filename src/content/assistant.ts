export type AssistantStarter = { label: string; href: string; message: string };

/** All public Scout interface copy lives here. */
export const assistantContent = {
  name: 'Scout',
  subtitle: 'AI Architecture Guide',
  launcherLabel: 'Open Scout, AI Architecture Guide',
  closeLabel: 'Minimize Scout',
  greeting: 'Welcome! What brings you here today?',
  supporting: 'I can help you explore the right technology for your business.',
  startersLabel: 'Explore a starting point',
  previewLabel: 'A starting point for your next idea',
  availability: 'Scout can make mistakes. Please don’t share sensitive information.',
  inputLabel: 'Message Scout',
  placeholder: 'Type your message...',
  sendLabel: 'Send message to Scout',
  failure: 'Scout could not finish this reply. Please retry in a moment.',
  thinking: 'Scout is replying…',
  retryLabel: 'Retry reply',
  newConversationLabel: 'New Conversation',
  conversationLabel: 'Conversation with Scout',
  senderLabels: { assistant: 'Scout', user: 'You' },
  restoreLabel: 'Restoring your conversation…',
  contactLabel: 'Go to Contact',
  starters: [
    { label: 'Explore AI solutions', href: '/ai-solutions', message: 'How can AI help my business, and where should I start?' },
    { label: 'Salesforce consulting', href: '/salesforce', message: 'How can you help modernize our Salesforce org?' },
    { label: 'Custom software', href: '/ai-solutions#capabilities', message: 'What do your custom business applications include, and how much do they cost?' },
    { label: 'Discuss my project', href: '/contact', message: 'I would like to discuss a project. What would be useful to tell you first?' },
  ] satisfies AssistantStarter[],
} as const;

/** Future conversation adapters can supply this model without changing the UI. */
export type AssistantMessageData = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
};

export const assistantWelcome: readonly AssistantMessageData[] = [
  { id: 'welcome', role: 'assistant', content: assistantContent.greeting },
  { id: 'supporting', role: 'assistant', content: assistantContent.supporting },
];

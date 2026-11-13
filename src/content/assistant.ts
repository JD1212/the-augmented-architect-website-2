export type AssistantStarter = { label: string; href: string };

/** All public Scout copy lives here. No conversation service is connected. */
export const assistantContent = {
  name: 'Scout',
  subtitle: 'AI Architecture Guide',
  launcherLabel: 'Open Scout, AI Architecture Guide',
  closeLabel: 'Minimize Scout',
  greeting: 'Welcome! What brings you here today?',
  supporting: 'I can help you explore the right technology for your business.',
  startersLabel: 'Explore a starting point',
  previewLabel: 'A starting point for your next idea',
  availability: 'AI conversation is coming soon. Messages are not sent.',
  inputLabel: 'Message draft — AI conversation coming soon',
  placeholder: 'Type your message...',
  sendLabel: 'Check messaging availability',
  unavailable: 'Your message has not been sent. Live conversation is coming soon. You can discuss your project through our Contact page.',
  contactLabel: 'Go to Contact',
  starters: [
    { label: 'Explore AI solutions', href: '/ai-solutions' },
    { label: 'Salesforce consulting', href: '/salesforce' },
    { label: 'Custom software', href: '/ai-solutions#capabilities' },
    { label: 'Discuss my project', href: '/contact' },
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

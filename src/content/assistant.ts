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
  dictation: {
    start: 'Start dictation', stop: 'Stop dictation',
    hint: 'Dictate a message. Your browser may process speech online.',
    starting: 'Starting microphone…', listening: 'Listening. Tap the microphone to stop.', stopping: 'Finishing dictation…',
    unsupported: 'Voice input is unavailable in this browser. You can still type.',
    errors: {
      denied: 'Microphone access was denied. Allow it in your browser settings, or keep typing.',
      network: 'Speech recognition could not connect. Your draft is safe; try again or keep typing.',
      unavailable: 'The microphone or speech service is unavailable. You can still type.',
      noSpeech: 'No speech was recognized. Tap the microphone to try again, or keep typing.',
      failed: 'Dictation stopped. Your draft is safe; try again or keep typing.',
      tooLong: 'Your message has reached the 1,000-character limit. Edit it before continuing.',
    },
  },
  failure: 'Scout could not finish this reply. Please retry in a moment.',
  thinking: 'Scout is replying…',
  retryLabel: 'Retry reply',
  newConversationLabel: 'New Conversation',
  conversationLabel: 'Conversation with Scout',
  senderLabels: { assistant: 'Scout', user: 'You' },
  restoreLabel: 'Restoring your conversation…',
  returningGreeting: 'Welcome back! Would you like to continue our previous conversation or start something new?',
  continueLabel: 'Continue previous conversation',
  startNewLabel: 'Start a new conversation',
  restoreRetryLabel: 'Try again',
  sessionRecoveryFailure: 'Scout could not establish a secure session. Please allow cookies for this site, then retry. Your message has been kept.',
  contactLabel: 'Go to Contact',
  bookingLinkLabel: 'Book Consultation',
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

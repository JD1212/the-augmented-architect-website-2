export type AssistantStarter = { label: string; href: string; message: string };

/** All public Scout interface copy lives here. */
export const assistantContent = {
  name: 'Scout',
  subtitle: 'Your AI website guide',
  launcherLabel: 'Open Scout, AI Architecture Guide',
  closeLabel: 'Minimize Scout',
  greeting: "Hi, I'm Scout. Welcome!",
  supporting: 'I can help you explore our services, answer questions about what we build, and find the right solution for your business.',
  schedulingWelcome: "When you're ready, I can also schedule, reschedule, or cancel your free 30-minute consultation.",
  welcomeClosing: 'Just ask me anything.',
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
  bookingEntry: {
    request: "I'd like to book a free 30-minute consultation.",
    manual: 'Use the booking form instead',
  },
  starters: [
    { label: 'What can you build for my business?', href: '/custom-applications', message: 'What can you build for my business?' },
    { label: 'Tell me about your AI solutions', href: '/ai-solutions', message: 'Tell me about your AI solutions' },
    { label: 'How do you modernize Salesforce?', href: '/salesforce', message: 'How do you modernize Salesforce?' },
    { label: 'Book a free consultation', href: '/book', message: 'Book a free consultation' },
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
  { id: 'scheduling', role: 'assistant', content: assistantContent.schedulingWelcome },
  { id: 'invitation', role: 'assistant', content: assistantContent.welcomeClosing },
];

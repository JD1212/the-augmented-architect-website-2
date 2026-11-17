export const privacy = {
  measurementId: 'G-STBZV24WWN',
  title: 'Privacy and analytics',
  description: 'How The Augmented Architect uses essential website storage and optional analytics.',
  preferences: 'Privacy preferences',
  bannerTitle: 'Your analytics preferences',
  bannerDescription: 'With your permission, Google Analytics helps us understand website visits and consultation results. It does not receive your Scout messages, contact information, or appointment details. Advertising tracking stays off.',
  allow: 'Allow analytics', decline: 'Decline analytics', close: 'Keep current choice',
  readMore: 'Read our privacy information', contact: 'Contact The Augmented Architect',
  browserPrivacy: 'Your browser privacy setting or automated browsing mode prevents optional analytics on this visit.',
  paragraphs: [
    ['Essential website functions', 'Scout and consultation booking use secure session cookies and browser storage to maintain conversations, verify ownership, and complete the actions you request. These functions remain available when optional analytics is declined. Microphone dictation uses your browser’s speech-recognition facilities; its availability and processing depend on your browser and provider.'],
    ['Optional Google Analytics', 'Only after you allow analytics do we load Google Analytics 4. It measures approved public-page visits, explicit Scout openings, consultation starts, confirmed booking outcomes, and foreground engagement with service pages. Google may process cookie identifiers, device/browser information, and approximate location derived from network information. We do not enable advertising, remarketing, Google signals, or personalized advertising.'],
    ['Information excluded from analytics', 'We do not send Scout messages, transcripts, dictation, names, email addresses, phone numbers, verification codes, appointment details, Google Meet links, conversation identifiers, or booking identifiers to Google Analytics. Page URLs exclude query strings and fragments, and referrers are restricted to approved paths or their origin.'],
    ['Your choice and storage', 'Analytics is denied by default. Your preference is stored on this browser for up to 180 days, and you can change it through Privacy preferences in the footer. Declining analytics does not prevent using this website, Scout, or booking. Withdrawal stops collection, clears accessible Google Analytics cookies, and reloads the page to unload the tag. It does not erase information already processed by Google. Browser privacy preferences are respected.'],
    ['Service information and privacy requests', 'Information you choose to provide to Scout or the booking form is processed to answer your questions, maintain the conversation, verify scheduling actions, and arrange consultations using our existing application, AI, database, calendar, and email providers. It is separate from optional analytics. Use our Contact page to ask about this processing or raise a privacy request.'],
  ],
} as const;

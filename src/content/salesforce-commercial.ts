/** Owner-approved consulting offer and personally guided evaluation booking. */
export const salesforceCommercial = {
  trialBookingEnabled: true,
  eyebrow: 'A PRACTICAL STARTING POINT',
  title: 'We build the architecture. You keep it.',
  description: 'The management tools are optional.',
  implementation: {
    price: '$10,000', label: 'Starting one-time implementation',
    benefits: [
      'One-time, defined-scope engagement.',
      'Installation and configuration of Trigger Runtime and Architecture Command Center.',
      'Setup and validation of the thin-trigger, Custom Metadata-driven architecture.',
      'Modernization of one mutually agreed Salesforce object within a defined scope.',
      'Demonstration, testing, and practical administrator/developer handoff.',
    ],
    retention: 'Keep your implemented Trigger Runtime architecture without an ongoing software subscription.',
  },
  subscription: {
    price: '$6,000/year', label: 'Optional management and development tools',
    description: 'Continued access to Architecture Command Center and supported developer tooling for automation discovery, dependency inspection, Trigger Action management, and AI-ready VS Code development.',
    benefits: [
      'Continued Architecture Command Center and supported developer-tool access.',
      'Discovery, dependency inspection, and supported Trigger Action management.',
      'AI-ready VS Code source and context workflow.',
      'An optional ongoing software subscription.',
    ],
    boundary: 'The subscription is optional. Your existing Trigger Runtime automation continues operating without ongoing management-tool access.',
  },
  trial: {
    label: 'Start Free 30-Day Trial',
    supporting: 'Try our Salesforce architecture tools in your own Developer Sandbox. Free personal walkthrough included.',
    arrangement: 'A free 30-minute appointment to arrange your guided evaluation together.',
    request: "I'd like to book a free 30-minute Salesforce sandbox trial setup consultation for a personally guided 30-day evaluation.",
    eventTitle: 'Salesforce Sandbox Trial Setup — The Augmented Architect',
    eventDetails: '30-minute setup consultation for a personally guided 30-day Salesforce sandbox evaluation. Eligibility, installation, and trial arrangements are handled personally during the appointment. This booking does not automatically install, activate, or expire software.',
    preparation: "You're booked! For your Salesforce trial setup, just have a Developer Sandbox ready. We'll walk you through everything during our appointment.",
  },
} as const;
export type BookingIntent = 'consultation' | 'salesforce-trial';

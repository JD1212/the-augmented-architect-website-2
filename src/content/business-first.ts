import type { IconName } from './site';

type Principle = { number: string; title: string; paragraphs: readonly string[] };
type MemoryLayer = { title: string; description: string };
type JourneyAgent = { stage: string; name: string; action: string; scope: string; continuity: string; icon: IconName };
type BusinessFirstContent = {
  eyebrow: string;
  title: string;
  introduction: readonly string[];
  principlesLabel: string;
  principles: readonly Principle[];
  journey: {
    label: string; title: string; description: string; caption: string;
    identity: { label: string; name: string; monogram: string; keyLabel: string; key: string; boundary: string; references: readonly { label: string; value: string }[] };
    memory: { label: string; title: string; permission: string; description: string; layers: readonly MemoryLayer[]; sourceNote: string };
    agentsLabel: string; accessLabel: string; scopeLabel: string; agents: readonly JourneyAgent[];
  };
};

export const businessFirst: BusinessFirstContent = {
  eyebrow: 'OUR BUSINESS-FIRST APPROACH',
  title: 'Your business has a memory. Your AI should share it.',
  introduction: [
    'An individual agent can remember a conversation. But your business needs continuity across every interaction, application, and customer relationship.',
    'We design intelligent systems around shared identities, connected business context, and persistent memory—so your agents work from the same understanding of your customers, employees, vendors, and operations, regardless of which technology runs them.',
  ],
  principlesLabel: 'Four architectural principles',
  principles: [
    {
      number: '01', title: 'Unified business identity',
      paragraphs: [
        'A customer, employee, vendor, or other business entity should have a consistent identity across applications and agents.',
        'We establish a business-level identity and associate it with relevant external system identifiers, such as CRM records, billing accounts, and scheduling records.',
        'This avoids treating the same person or organization as unrelated entities in every system.',
      ],
    },
    {
      number: '02', title: 'Persistent business memory',
      paragraphs: [
        'Agent execution context is often temporary or specific to a runtime.',
        'We design persistent business memory and context systems that preserve relevant interactions, verified information, relationships, and operational history across sessions and agent executions.',
        'An agent’s working context and runtime/session memory support its own execution. Business-owned memory provides longer-lived continuity across systems and runtimes, including runtimes that already offer persistence.',
      ],
    },
    {
      number: '03', title: 'Connected customer journeys',
      paragraphs: [
        'A customer should not have to start over whenever they interact with a different agent or application.',
        'With authorized shared context, an inquiry can progress from sales to booking, fulfillment, billing, and support while preserving continuity across separate systems.',
      ],
    },
    {
      number: '04', title: 'Governed access to context',
      paragraphs: [
        'Shared memory does not mean unrestricted information access.',
        'Agents receive only the identities, information, tools, and operations required for their responsibilities.',
        'Access packages, permissions, and business-specific boundaries govern what each agent can see or execute.',
      ],
    },
  ],
  journey: {
    label: 'AN ILLUSTRATIVE CUSTOMER JOURNEY',
    title: 'One customer. One connected experience.',
    description: 'Independent agents. Different responsibilities. Continuity through a shared business identity and authorized context.',
    caption: 'Maria and these record IDs are fictional. This illustration explains our architecture and development approach; it does not represent completed Augmented Enterprises features or live integrations.',
    identity: {
      label: 'UNIFIED BUSINESS IDENTITY', name: 'Maria', monogram: 'M', keyLabel: 'Business identity', key: 'PERSON-MARIA', boundary: 'Within one business',
      references: [
        { label: 'CRM customer ID', value: 'CRM-MARIA' },
        { label: 'Booking ID', value: 'BOOK-MARIA' },
        { label: 'Billing account ID', value: 'BILL-MARIA' },
      ],
    },
    memory: {
      label: 'SHARED BUSINESS CONTEXT', title: 'A connected understanding, beyond a single agent.', permission: 'Authorized retrieval only',
      description: 'Maria’s identity connects relevant preferences, interactions, relationships, and operational history. Each agent retrieves only the context its role permits.',
      layers: [
        { title: 'Per-run working context', description: 'The current task, tool results, and information needed for this execution.' },
        { title: 'Runtime/session memory', description: 'Conversation history and continuity provided by an agent’s runtime.' },
        { title: 'Business-owned memory', description: 'Relevant, verified knowledge that can support authorized work across systems and runtimes.' },
      ],
      sourceNote: 'Source records can remain in their own systems. Identity mapping links those records; relevant context is retrieved or retained according to business permissions, rather than copying everything into one database.',
    },
    agentsLabel: 'Independent agent experiences across systems and runtimes',
    accessLabel: 'Context and tools scoped to each agent’s responsibilities',
    scopeLabel: 'AUTHORIZED CONTEXT',
    agents: [
      { stage: '01 · INQUIRY', name: 'Sales Agent', action: 'Understands Maria’s service inquiry.', scope: 'Customer identity, contact preferences, and the relevant CRM interaction.', continuity: 'Passes the agreed service request forward.', icon: 'chart' },
      { stage: '02 · SCHEDULING', name: 'Booking Agent', action: 'Schedules the service Maria requested.', scope: 'The service request and authorized scheduling and booking information.', continuity: 'Carries the appointment reference into the journey.', icon: 'layers' },
      { stage: '03 · ONGOING SUPPORT', name: 'Support Agent', action: 'Continues from Maria’s existing request.', scope: 'Relevant booking details and support history, within its access package.', continuity: 'Helps Maria without starting the conversation over.', icon: 'cloud' },
    ],
  },
};

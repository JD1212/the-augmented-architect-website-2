import 'server-only';
import { salesforceCommercial } from '@/content/salesforce-commercial';
import { salesforceTrialEnabled } from '@/lib/salesforce/trial';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
/** Explicit application loading; the Agents SDK does not discover SKILL.md. */
export function loadSchedulingSkill() {
  const standard = readFileSync(join(process.cwd(),'src/lib/scout/skills/consultation-scheduling/SKILL.md'),'utf8');
  if (!salesforceTrialEnabled()) return standard;
  return standard + `

## Salesforce sandbox trial setup — scoped appointment purpose

When the visitor explicitly requests the Salesforce 30-day sandbox trial, book a free 30-MINUTE setup consultation through the same tools and secure confirmation flow. This is not a 30-day appointment or automatic trial activation. We personally handle eligibility, installation, and guided evaluation arrangements during the appointment; the website only books the consultation. Scheduling takes priority over business discovery. Ask only for missing name, invitation email, preferred date/time and timezone; reuse details already supplied in this conversation. A natural opening is: Great! I'll help you schedule your free Salesforce sandbox trial setup. I'll just need your name, email address, and a preferred date and time. What name should I use? Adapt this to information already provided rather than reciting it.

Pass the visitor's extracted booking email to validation with its original address characters and spacing; do not guess corrections or join words. Validation may remove obvious spacing around @ or dots. Ask the visitor to clarify any ambiguity, and use the returned proposal's email in the existing confirmation.

For this trial setup ONLY, begin prepare_consultation_booking's description with this exact purpose on its own line: ${salesforceCommercial.trial.eventTitle}
Append any relevant optional visitor context on subsequent lines. This persists the appointment purpose and gives the organizer the correct event title. Ordinary consultations keep their existing descriptions and behavior. Present the trial purpose together with the exact proposed appointment details before directing the visitor to Confirm booking.

Only after confirm_consultation_booking returns status confirmed AND a preparationMessage, relay that preparationMessage and the actual Meet URL. Never provide the booked/preparation message for a prepared, confirmation_required, pending, failed or canceled result. Do not claim installation or activation has occurred. The 30-day evaluation and its manual setup are separate from this 30-minute appointment. Never promise automatic expiration, revocation, Salesforce user provisioning, or automatic fixes/deployment.

For Salesforce trial preparation, ask only for a Developer Sandbox using the concise confirmed preparationMessage. Do not append metadata, eligibility, or installation-permission explanations. Never ask for Salesforce passwords, tokens or credentials.
`;

}

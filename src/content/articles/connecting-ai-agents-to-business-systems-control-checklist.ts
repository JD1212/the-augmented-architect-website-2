import type {Article} from './types';

// Editorial Preview only. Production publication requires exact-revision approval.
export const article:Article = {
  "slug": "connecting-ai-agents-to-business-systems-control-checklist",
  "title": "Connecting AI Agents to Business Systems: A Practical Control Checklist",
  "seoTitle": "AI Agents and Business Systems: A Security Checklist",
  "category": "ai-architecture",
  "summary": "A practical guide for business and technical teams connecting AI agents to APIs, data, and workflows. Learn what to inventory, how to scope identity and authorization, where human approval belongs, and how to test unsafe tool use and failure handling.",
  "seoDescription": "Plan safer AI integrations with an agent and system inventory, least-privilege access, server-side authorization, human approval, and failure testing.",
  "status": "draft",
  "content": [
    {
      "type": "paragraph",
      "text": "An AI agent connected to business systems can do more than answer questions: depending on its tools and permissions, it may retrieve sensitive records, update data, or initiate a workflow. The key design question is not just whether the model gives a useful answer. It is what the complete system is permitted to do, who is accountable for it, and what happens when a tool call is mistaken, manipulated, or unavailable."
    },
    {
      "type": "paragraph",
      "text": "Treat the agent as one component in a larger application—not as the authorization layer. The application and connected systems should decide whether an action is allowed, based on an authenticated identity, the user's rights, the specific operation, and the relevant business rules. That separation makes permissions reviewable and gives teams a place to stop or constrain actions regardless of what the model proposes.",
      "links": [
        {
          "url": "https://learn.microsoft.com/en-us/security/saf/technologies/ai/overview",
          "label": "Microsoft Security Adoption Framework: Secure AI with Zero Trust"
        }
      ],
      "citationIds": [
        "microsoft-secure-ai"
      ]
    },
    {
      "type": "heading",
      "text": "1. Inventory the agent and everything it can reach",
      "level": 2
    },
    {
      "type": "paragraph",
      "text": "Start with a concrete inventory for each use case. Record the agent's business purpose, owner, runtime and model dependencies, tools, connectors, data sources, API operations, environments, and the human or service identity used to access them. Note whether a tool can read, create, change, delete, send, approve, or trigger an external process. Include indirect paths: a connector may expose a broader service or workflow than the agent interface suggests.",
      "links": [
        {
          "url": "https://learn.microsoft.com/en-us/security/saf/technologies/ai/overview",
          "label": "Microsoft AI security control areas"
        }
      ],
      "citationIds": [
        "microsoft-secure-ai"
      ]
    },
    {
      "type": "list",
      "text": "For every connection, document these review questions:",
      "items": [
        "Which system and data can it reach?",
        "Which exact operations are exposed, and which are read-only versus state-changing?",
        "Whose identity is used: an end user, a dedicated service identity, or another principal?",
        "Who owns the business process, connector, credentials, and incident response?",
        "What data may be returned to the model, logged, retained, or shown to a user?",
        "What is the approved fallback if the agent, API, or identity provider is unavailable?"
      ],
      "citationIds": [
        "microsoft-secure-ai",
        "nist-ai-rmf"
      ]
    },
    {
      "type": "paragraph",
      "text": "Assign an accountable business owner and a technical owner, even if one person initially fills both roles. The business owner defines which outcomes and exceptions are acceptable; the technical owner maintains the integration and its controls. Record approval and review points through the lifecycle, not only at launch. This is a practical application of risk-management guidance, not a claim that naming owners alone makes a system safe.",
      "links": [
        {
          "url": "https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf",
          "label": "NIST AI Risk Management Framework 1.0"
        }
      ],
      "citationIds": [
        "nist-ai-rmf"
      ]
    },
    {
      "type": "heading",
      "text": "2. Give each integration a narrow identity and permission set",
      "level": 2
    },
    {
      "type": "paragraph",
      "text": "Avoid treating an agent as a trusted employee or giving it a broad, shared credential. Prefer a dedicated, traceable identity for a defined purpose, and grant only the API scopes and operations required for that use case. Separate read access from write access where the provider allows it. Keep credentials out of prompts and client-side code; use the application's server-side secret-management and rotation practices. Review token expiry, revocation, and credential ownership as part of operations.",
      "links": [
        {
          "url": "https://learn.microsoft.com/en-us/security/saf/technologies/ai/overview",
          "label": "Microsoft AI security control areas"
        }
      ],
      "citationIds": [
        "microsoft-secure-ai"
      ]
    },
    {
      "type": "paragraph",
      "text": "A service identity can simplify reliable integration, but it can also conceal which end user requested an action. Preserve the user and request context separately, and enforce the applicable user-level and business-level rules on the server. If a downstream system supports delegated user authorization, assess whether it better fits the use case; it does not remove the need to validate each requested operation.",
      "citationIds": [
        "microsoft-secure-ai"
      ]
    },
    {
      "type": "heading",
      "text": "3. Enforce authorization at the server and tool boundary",
      "level": 2
    },
    {
      "type": "paragraph",
      "text": "A model's choice of tool is a request, not permission. At the server boundary, validate the caller, the target record, the requested operation, the user's rights, and business constraints. Apply the same authorization checks to agent-originated actions that apply to other application paths. Do not rely on prompt instructions, hidden UI controls, or a tool description to prevent unauthorized access.",
      "links": [
        {
          "url": "https://learn.microsoft.com/en-us/security/saf/technologies/ai/overview",
          "label": "Microsoft AI security control areas"
        }
      ],
      "citationIds": [
        "microsoft-secure-ai"
      ]
    },
    {
      "type": "diagram",
      "text": "Conceptual action path. Each boundary is a place for validation, logging, and a safe refusal or fallback.",
      "items": [
        "User request and authenticated session",
        "Application checks user, purpose, and access context",
        "Agent proposes a tool call",
        "Server validates tool, arguments, scope, record access, and business rules",
        "Approved operation reaches the downstream API using a restricted identity",
        "Result is filtered for the intended user and recorded according to policy"
      ],
      "citationIds": [
        "microsoft-secure-ai"
      ]
    },
    {
      "type": "paragraph",
      "text": "Keep tool interfaces narrow and explicit. Prefer separate tools for distinct operations over a single powerful tool that accepts arbitrary destinations, queries, or commands. Validate arguments against expected types and allowed values; constrain record identifiers and query scope; and reject unexpected fields or operations. The downstream service remains a separate trust boundary: its own authorization and validation should not be assumed merely because the agent layer checked something.",
      "links": [
        {
          "url": "https://genai.owasp.org/top-10-for-agentic-applications-2026/",
          "label": "OWASP Top 10 for Agentic Applications 2026"
        }
      ],
      "citationIds": [
        "owasp-agentic-2026",
        "microsoft-secure-ai"
      ]
    },
    {
      "type": "heading",
      "text": "4. Put human approval where consequences justify it",
      "level": 2
    },
    {
      "type": "paragraph",
      "text": "Human review is most useful when it is tied to a specific decision, not used as a vague promise that a person is “in the loop.” Consider requiring an authorized person's approval before an agent sends an external commitment, changes a high-impact record, issues a payment or refund, alters access, or triggers an operational action that is difficult to reverse. The appropriate threshold depends on the business risk and the ability to undo the action.",
      "links": [
        {
          "url": "https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf",
          "label": "NIST AI Risk Management Framework 1.0"
        },
        {
          "url": "https://genai.owasp.org/top-10-for-agentic-applications-2026/",
          "label": "OWASP agentic application risks"
        }
      ],
      "citationIds": [
        "nist-ai-rmf",
        "owasp-agentic-2026"
      ]
    },
    {
      "type": "list",
      "text": "Make an approval meaningful by showing the reviewer:",
      "items": [
        "The proposed action and the exact data or records it will affect.",
        "The relevant user request and material context, including uncertainty or missing information.",
        "The identity and authority of the person approving.",
        "A clear approve, reject, or request-changes choice, with no action taken by default while awaiting review.",
        "A record of the decision and the resulting action or failure."
      ],
      "citationIds": [
        "nist-ai-rmf"
      ]
    },
    {
      "type": "paragraph",
      "text": "Approval adds delay and operational work. Use it selectively: low-impact, reversible actions may be eligible for bounded automation, while high-impact or hard-to-reverse actions may warrant a human gate. Approval does not substitute for authorization. The server must still verify that the approver can approve that action and that the underlying request remains valid when approval is applied.",
      "citationIds": [
        "nist-ai-rmf",
        "microsoft-secure-ai"
      ]
    },
    {
      "type": "heading",
      "text": "5. Test misuse and failure, not only the happy path",
      "level": 2
    },
    {
      "type": "paragraph",
      "text": "A successful demonstration shows that a path can work; it does not establish that unsafe paths are blocked. Build tests around the system's trust boundaries and the actual tools it exposes. Include attempts to redirect the agent's goal, induce an unauthorized tool call, use a broader identity than intended, pass malformed or out-of-scope arguments, and exploit data or instructions returned by connected systems. These are test ideas prompted by recognized agentic risk categories, not a claim that every system contains those weaknesses.",
      "links": [
        {
          "url": "https://genai.owasp.org/top-10-for-agentic-applications-2026/",
          "label": "OWASP Top 10 for Agentic Applications 2026"
        }
      ],
      "citationIds": [
        "owasp-agentic-2026"
      ]
    },
    {
      "type": "list",
      "text": "Exercise failure handling as deliberately as tool behavior:",
      "items": [
        "Make the API time out, return an error, or return incomplete data; confirm the agent does not invent a successful result or silently repeat a consequential action.",
        "Simulate expired or revoked credentials and confirm access fails closed and alerts reach an owner.",
        "Interrupt a workflow after approval but before completion; define how to detect partial completion and safely resume or reconcile it.",
        "Test duplicate requests and retries so that a repeated call cannot unintentionally create duplicate transactions or messages.",
        "Verify that sensitive data is not exposed in error messages, logs, or results presented to a user who lacks access.",
        "Confirm a human can stop, disable, or restrict the agent and that the team knows how to investigate its actions."
      ],
      "citationIds": [
        "owasp-agentic-2026",
        "nist-ai-rmf"
      ]
    },
    {
      "type": "paragraph",
      "text": "For each test, define the expected behavior before running it: reject, ask for clarification, require approval, retry within a safe limit, or hand off to a person. Capture the tool request, authorization decision, result, and failure state in a way that supports investigation while respecting data-retention and privacy requirements. Revisit tests when tools, permissions, prompts, models, workflows, or connected systems change.",
      "links": [
        {
          "url": "https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf",
          "label": "NIST AI Risk Management Framework 1.0"
        }
      ],
      "citationIds": [
        "nist-ai-rmf",
        "owasp-agentic-2026"
      ]
    },
    {
      "type": "heading",
      "text": "Example: changing a customer account",
      "level": 2
    },
    {
      "type": "paragraph",
      "text": "Consider an illustrative customer-portal assistant asked to change an account’s billing contact. This is a design example, not a description of a deployed customer system. The assistant may help collect the request, but the application must decide whether the signed-in user can change that account and whether the proposed update needs human approval.",
      "citationIds": [
        "microsoft-secure-ai"
      ]
    },
    {
      "type": "list",
      "text": "A bounded workflow could work as follows:",
      "items": [
        "Read the account through a tool scoped to the authenticated customer; never trust an account identifier alone.",
        "Collect the requested change and show the exact proposed update for confirmation. Keep the user’s confirmation separate from any staff approval required by policy.",
        "On execution, recheck record access, allowed fields, current data, and any approval. Apply the change through a narrow server-side operation.",
        "Use an idempotency key and the provider’s supported guarantees to prevent a repeated submission from applying the operation twice. Reconcile an uncertain result before retrying.",
        "Record the outcome with a request identifier and enough context for investigation, while excluding secrets and unnecessary personal information."
      ],
      "citationIds": [
        "microsoft-secure-ai",
        "owasp-agentic-2026"
      ]
    },
    {
      "type": "paragraph",
      "text": "If the downstream API times out, the agent should report that the result is uncertain, rather than claiming success. A person or a reconciliation process can check the system of record before another attempt. An approval authorizes only the reviewed action; it should not unlock broader access or remain valid after the request materially changes."
    },
    {
      "type": "heading",
      "text": "A practical review before connecting an agent",
      "level": 2
    },
    {
      "type": "list",
      "text": "Use this checklist to structure a design review:",
      "items": [
        "Is the agent's purpose, business owner, technical owner, and operating boundary documented?",
        "Are all connected systems, data sources, tools, identities, and exposed operations inventoried?",
        "Does each identity have only the access required, and can it be revoked or rotated?",
        "Does the server independently authorize each action and validate its arguments and target records?",
        "Which actions are consequential or hard to reverse, and what exact human approval is required?",
        "Have unsafe tool use, unauthorized access, API errors, timeouts, retries, partial completion, and shutdown been tested?",
        "Who reviews logs and alerts, responds to incidents, and approves material changes?",
        "When will controls and ownership be reviewed again?"
      ],
      "citationIds": [
        "nist-ai-rmf",
        "microsoft-secure-ai",
        "owasp-agentic-2026"
      ]
    },
    {
      "type": "heading",
      "text": "Where implementation scope needs to be explicit",
      "level": 2
    },
    {
      "type": "paragraph",
      "text": "We help teams design connected applications and practical AI integrations around their business processes, identities, and permissions. Our $10,000 starting Custom Business Applications implementation includes one agreed AI-agent use case and up to four agreed, supported API connections in total, including scheduling where applicable. The controls required for a particular workflow are agreed during discovery; advanced integrations, additional agent capabilities, and ongoing costs are scoped separately.",
      "links": [
        {
          "url": "/ai-solutions",
          "label": "AI Solutions"
        },
        {
          "url": "/custom-applications",
          "label": "Custom Business Applications"
        }
      ]
    },
    {
      "type": "paragraph",
      "text": "A useful first step is to bring one candidate workflow, its connected systems, and the actions it may take to a design discussion. The goal is to clarify what should be automated, what must remain under human control, and what implementation scope the use case requires."
    },
    {
      "type": "cta",
      "text": "Discuss an AI integration or connected application with The Augmented Architect.",
      "link": {
        "url": "/book",
        "label": "Book a consultation"
      }
    }
  ],
  "references": [
    {
      "id": "nist-ai-rmf",
      "url": "https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf",
      "title": "NIST AI Risk Management Framework 1.0"
    },
    {
      "id": "microsoft-secure-ai",
      "url": "https://learn.microsoft.com/en-us/security/saf/technologies/ai/overview",
      "title": "Microsoft Security Adoption Framework: Secure AI with Zero Trust"
    },
    {
      "id": "owasp-agentic-2026",
      "url": "https://genai.owasp.org/top-10-for-agentic-applications-2026/",
      "title": "OWASP Top 10 for Agentic Applications 2026"
    }
  ],
  "publication": {
    "id": "8965f479-3459-489d-a208-100a0cfdda84",
    "revisionId": "5476b478-dcde-4b36-ada7-309f8375bc09",
    "revisionHash": "e683accea977957d8edced4d3e063ba36ffb6f46ae3ff61d2d433f9fe591ae3a",
    "sourceOpportunityId": "8750658d-3896-41a4-a386-cd6dc4bb7c8e"
  },
  "format": "Technical guide"
};

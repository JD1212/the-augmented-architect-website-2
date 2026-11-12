import { diagrams } from '@/content/experience';
import { Icon } from './icon';

/** A conceptual system diagram, never presented as a production application UI. */
export function ArchitectureDiagram({ variant = 'business', compact = false }: { variant?: keyof typeof diagrams; compact?: boolean }) {
  const diagram = diagrams[variant];
  return (
    <div className={`architecture-diagram${compact ? ' diagram-compact' : ''}`}>
      <div className="diagram-heading"><span className="diagram-dot" /><span>{diagram.label}</span><span className="diagram-index" aria-hidden="true">↗</span></div>
      <div className="diagram-canvas">
        <svg className="diagram-connectors" viewBox="0 0 600 300" preserveAspectRatio="none" fill="none" aria-hidden="true">
          <path d="M110 52H190Q215 52 215 77V125Q215 150 245 150M110 150H245M110 248H190Q215 248 215 223V175Q215 150 245 150M355 150H380Q405 150 405 125V77Q405 52 430 52H490M355 150H490M355 150H380Q405 150 405 175V223Q405 248 430 248H490" />
          <circle cx="215" cy="150" r="4" /><circle cx="405" cy="150" r="4" />
        </svg>
        <ul className="diagram-nodes diagram-inputs">{diagram.inputs.map(node => <li key={node.label}><Icon name={node.icon} /><span>{node.label}</span></li>)}</ul>
        <div className="diagram-core"><div className="diagram-core-icon"><Icon name={diagram.center.icon} /></div><strong>{diagram.center.title}</strong><span>{diagram.center.description}</span></div>
        <ul className="diagram-nodes diagram-outputs">{diagram.outputs.map(node => <li key={node.label}><Icon name={node.icon} /><span>{node.label}</span></li>)}</ul>
      </div>
      <ul className="diagram-foundation">{diagram.foundation.map(label => <li key={label}><span aria-hidden="true">✓</span>{label}</li>)}</ul>
      <p className="diagram-note">{diagram.note}</p>
    </div>
  );
}

import 'server-only';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
/** Explicit application loading; the Agents SDK does not discover SKILL.md. */
export function loadSchedulingSkill() {
  return readFileSync(join(process.cwd(),'src/lib/scout/skills/consultation-scheduling/SKILL.md'),'utf8');
}

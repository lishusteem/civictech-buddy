import type { Project } from '@/lib/project/schema';
import { helpRoles } from './HowToHelp';
import { isSelfName, pitchOf, publicQuestions } from './publicPage';

export type PrepublishCheck = {
  /** The hero has a sentence (pitch, or its fallback from the description or the problem). */
  pitch: boolean;
  contact: boolean;
  /** First team member still called „tu” / „eu” / „me”; null when every name is real. */
  selfNamed: { id: string; name: string } | null;
  /** At least one role is sought (seeking or partner), so „Cum poți ajuta” appears. */
  seekingRole: boolean;
  /** How many open questions the public page will list. */
  publicQuestions: number;
};

/** What Rezumat checks before publishing (spec §8.1). Informative only: it never blocks publishing. */
export function prepublishCheck(p: Project): PrepublishCheck {
  const self = p.team.find((m) => isSelfName(m.name));
  return {
    pitch: pitchOf(p).text !== '',
    contact: p.project.contact.trim() !== '',
    selfNamed: self ? { id: self.id, name: self.name } : null,
    seekingRole: helpRoles(p).length > 0,
    publicQuestions: publicQuestions(p).length,
  };
}

import type { Project, StepId } from '../project/schema';

export type Phase = 'context' | 'toc' | 'organize';

export type StepDef = {
  id: StepId;
  number: number;
  phase: Phase;
  title: string;
  minutes: number;
  summary: string;
};

export const STEPS: StepDef[] = [
  { id: 'project', number: 1, phase: 'context', title: 'Proiectul și echipa', minutes: 4, summary: 'Ce faci, ce funcții ai, cine e în echipă' },
  { id: 'problem', number: 2, phase: 'context', title: 'Problema', minutes: 3, summary: 'Ce se întâmplă azi, cui, de unde știi' },
  { id: 'existing', number: 3, phase: 'context', title: 'Ce există deja', minutes: 2, summary: 'Cine a mai încercat și ce e diferit' },
  { id: 'target', number: 4, phase: 'toc', title: 'Schimbarea țintă', minutes: 3, summary: 'Ce e diferit, pentru cine, dacă reușești' },
  { id: 'actors', number: 5, phase: 'toc', title: 'Actorii', minutes: 3, summary: 'Cine suferă, decide, are datele, e exclus' },
  { id: 'relations', number: 6, phase: 'toc', title: 'Relațiile', minutes: 3, summary: 'Cine decide, finanțează, blochează pe cine' },
  { id: 'preconditions', number: 7, phase: 'toc', title: 'Precondițiile', minutes: 4, summary: 'Ce trebuie să fie adevărat înainte, și cine face' },
  { id: 'risks', number: 8, phase: 'toc', title: 'Ipotezele riscante', minutes: 3, summary: 'Ce e cel mai nesigur și cum verifici ieftin' },
  { id: 'roles', number: 9, phase: 'organize', title: 'Oamenii de care ai nevoie', minutes: 3, summary: 'Roluri din hartă: lobbist, jurist, organizator' },
  { id: 'backlog', number: 10, phase: 'organize', title: 'Backlog de organizare', minutes: 2, summary: 'Funcțiile tale ordonate + pași de organizare' },
];

export const PHASES: { id: Phase; title: 'Contextul' | 'Teoria schimbării' | 'Organizarea' }[] = [
  { id: 'context', title: 'Contextul' },
  { id: 'toc', title: 'Teoria schimbării' },
  { id: 'organize', title: 'Organizarea' },
];

export function minutesLeft(project: Project): number {
  return STEPS.reduce((sum, s) => (project.steps[s.id].status === 'done' ? sum : sum + s.minutes), 0);
}

import type { Project, StepId } from '../project/schema';
import { effectiveStatus } from './completion';

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
  { id: 'target', number: 4, phase: 'toc', title: 'Impact și rezultate pe termen lung', minutes: 3, summary: 'Unde vrei să ajungi: cine face ce diferit, peste 1–3 ani' },
  { id: 'actors', number: 5, phase: 'toc', title: 'Actorii', minutes: 3, summary: 'Cine suferă, decide, are datele, e exclus' },
  { id: 'relations', number: 6, phase: 'toc', title: 'Relațiile', minutes: 3, summary: 'Cine decide, finanțează, blochează pe cine' },
  { id: 'preconditions', number: 7, phase: 'toc', title: 'Drumul schimbării', minutes: 4, summary: 'Outputs și outcomes: de la ce livrați la ce se schimbă' },
  { id: 'risks', number: 8, phase: 'toc', title: 'Ipotezele', minutes: 3, summary: 'Assumptions: ce e cel mai nesigur și cum verifici ieftin' },
  { id: 'roles', number: 9, phase: 'organize', title: 'Oamenii de care ai nevoie', minutes: 3, summary: 'Roluri din hartă: lobbist, jurist, organizator' },
  { id: 'backlog', number: 10, phase: 'organize', title: 'Activitățile', minutes: 2, summary: 'Activities: ce faceți ca să existe realizările' },
];

export const PHASES: { id: Phase; title: 'Contextul' | 'Teoria schimbării' | 'Organizarea' }[] = [
  { id: 'context', title: 'Contextul' },
  { id: 'toc', title: 'Teoria schimbării' },
  { id: 'organize', title: 'Organizarea' },
];

export function minutesLeft(project: Project): number {
  return STEPS.reduce((sum, s) => (effectiveStatus(project, s.id) === 'done' ? sum : sum + s.minutes), 0);
}

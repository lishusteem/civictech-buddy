import type { Stage } from '../project/schema';

// PRD section 4, "Reguli de derivare". Hints for the AI, not a strict rule engine.
export const ROLE_RULES: { signal: string; role: string; stage: Stage }[] = [
  {
    signal: 'O instituție publică trebuie să-și schimbe o procedură sau să adopte tool-ul',
    role: 'Advocacy / relații instituționale (lobbist)',
    stage: 'mid',
  },
  {
    signal: 'Schimbarea cere modificarea unei legi, HG, regulament sau hotărâri de consiliu local',
    role: 'Jurist (drept administrativ)',
    stage: 'mid',
  },
  {
    signal: 'Proiectul prelucrează date personale sau se bazează pe cereri 544',
    role: 'Jurist GDPR / acces la informații',
    stage: 'start',
  },
  {
    signal: 'Datele sunt la o instituție, în format greu de folosit',
    role: 'Specialist date / date deschise',
    stage: 'start',
  },
  {
    signal: 'Utilizatorii sunt greu de atins (vârstnici, mediu rural, grupuri vulnerabile)',
    role: 'Organizator comunitar / lucrător de teren',
    stage: 'start',
  },
  {
    signal: 'Utilizatorii sunt nespecialiști și n-a vorbit nimeni cu ei',
    role: 'Cercetător UX / designer',
    stage: 'start',
  },
  {
    signal: 'Problema cere cunoștințe de domeniu (sănătate, educație, urbanism)',
    role: 'Expert de domeniu',
    stage: 'start',
  },
  {
    signal: 'Un ONG are deja relația cu beneficiarii',
    role: 'Parteneriat cu ONG-ul (nu un om nou)',
    stage: 'start',
  },
  {
    signal: 'Oamenii trebuie să afle de proiect / presa poate pune presiune',
    role: 'Comunicare / relația cu presa',
    stage: 'mid',
  },
  {
    signal: 'Un actor puternic se opune',
    role: 'Strateg de campanie',
    stage: 'mid',
  },
  {
    signal: 'Nu există răspuns la „cine plătește sau întreține peste un an”',
    role: 'Fundraising / scriere de proiecte',
    stage: 'mid',
  },
];

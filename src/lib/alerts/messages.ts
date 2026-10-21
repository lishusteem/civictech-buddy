import type { AlertCode } from '../project/schema';

// Texts copied from PRD section 5 (Alertele de naivitate). `step` is the first
// number of the table's "Pas" column.
// Placeholders: team_no_time uses {h}; powerful_actor_unused replaces
// "Ministerul X" with the actor name; all_on_one replaces "în 4 ore" with the
// person's hours (see codeAlerts.ts).
export const ALERT_MESSAGES: Record<AlertCode, { title: string; step: number; message: string }> = {
  team_no_time: {
    title: 'Echipă fără timp',
    step: 1,
    message: 'Aveți împreună {h} ore pe săptămână. Ce ar fi realist de făcut în primele 3 luni?',
  },
  solution_in_problem: {
    title: 'Soluția în problemă',
    step: 2,
    message: 'Ai descris ce lipsește (aplicația), nu ce se întâmplă oamenilor. Ce pățesc ei azi?',
  },
  no_evidence: {
    title: 'Fără dovadă',
    step: 2,
    message: 'De unde știi că problema există? Ai vorbit cu cineva care o are?',
  },
  first_in_world: {
    title: 'Primul de pe lume',
    step: 3,
    message: 'E rar ca nimeni să nu fi încercat. Ai căutat în Civic Tech Field Guide?',
  },
  app_as_goal: {
    title: 'Aplicația ca scop',
    step: 4,
    message: 'Și dacă o folosesc, ce e diferit în viața lor sau în instituție?',
  },
  abstract_change: {
    title: 'Schimbare fără actor',
    step: 4,
    message: 'Cine anume face ceva diferit? Ce ai vedea concret?',
  },
  nobody_excluded: {
    title: 'Nimeni exclus',
    step: 5,
    message: 'Cine nu poate folosi asta sau pierde ceva dacă reușești?',
  },
  only_users: {
    title: 'Doar utilizatori',
    step: 5,
    message: 'Cine poate schimba regula din spatele problemei?',
  },
  powerful_actor_unused: {
    title: 'Actor puternic uitat',
    step: 6,
    message: 'Ministerul X e cel mai puternic din hartă, dar nu apare nicăieri. E aliat, obstacol sau neutru?',
  },
  magic_leap: {
    title: 'Salt magic',
    step: 7,
    message: 'De ce ar duce A la B? Ce trebuie să fie adevărat?',
  },
  all_through_app: {
    title: 'Totul prin aplicație',
    step: 7,
    message: 'Ce trebuie să se întâmple fără cod? Pe cine trebuie să convingi?',
  },
  build_and_they_come: {
    title: '„Dacă o construim, vin”',
    step: 7,
    message: 'Cum află primii 50 de oameni de aplicație?',
  },
  hypothesis_without_test: {
    title: 'Ipoteză fără test',
    step: 8,
    message: 'Cum ai afla în două săptămâni dacă e adevărat?',
  },
  all_on_one: {
    title: 'Totul pe un om',
    step: 9,
    message: 'Ai marcat că faci tu și lobby, și juridic, și cod, în 4 ore pe săptămână. E realist?',
  },
  orphan_feature: {
    title: 'Feature orfan',
    step: 10,
    message: 'La ce ajută funcția asta? Poate așteaptă în lista „mai târziu”.',
  },
  only_code: {
    title: 'Doar cod',
    step: 10,
    message: 'Ce trebuie făcut în afara codului: întâlniri, parteneriate, teste cu oameni?',
  },
};

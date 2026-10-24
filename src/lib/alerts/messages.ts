import type { AlertCode } from '../project/schema';

// Texts copied from PRD section 5 (Alertele de naivitate). `step` is the first
// number of the table's "Pas" column.
// Placeholders: team_no_time uses {h}; powerful_actor_unused replaces
// "Ministerul X" with the actor name; orphan_feature replaces {text} with the feature text; all_on_one replaces "în 4 ore" with the
// person's hours (see codeAlerts.ts).
// `why` is the "De ce contează" line (UX redesign spec §5.4).
export const ALERT_MESSAGES: Record<AlertCode, { title: string; step: number; message: string; why: string }> = {
  team_no_time: {
    title: 'Echipă fără timp',
    step: 1,
    message: 'Aveți împreună {h} ore pe săptămână. Ce ar fi realist de făcut în primele 3 luni?',
    why: 'Cu puține ore, contează mai mult ce alegi să nu faci în primele 3 luni.',
  },
  solution_in_problem: {
    title: 'Soluția în problemă',
    step: 2,
    message: 'Ai descris ce lipsește (aplicația), nu ce se întâmplă oamenilor. Ce pățesc ei azi?',
    why: 'Grupul ajută mai ușor când vede ce pățesc oamenii azi, nu ce lipsește din tehnologie.',
  },
  no_evidence: {
    title: 'Fără dovadă',
    step: 2,
    message: 'De unde știi că problema există? Ai vorbit cu cineva care o are?',
    why: 'O dovadă mică (o discuție, un articol, o cerere 544) face problema credibilă pentru alții.',
  },
  first_in_world: {
    title: 'Primul de pe lume',
    step: 3,
    message: 'E rar ca nimeni să nu fi încercat. Ai căutat în Civic Tech Field Guide?',
    why: 'Ce s-a încercat deja îți arată ce a mers, ce nu și cu cine poți colabora.',
  },
  app_as_goal: {
    title: 'Aplicația ca scop',
    step: 4,
    message: 'Și dacă o folosesc, ce e diferit în viața lor sau în instituție?',
    why: 'Folosirea aplicației e un mijloc; grupul vrea să știe ce se schimbă în viața oamenilor.',
  },
  abstract_change: {
    title: 'Schimbare fără actor',
    step: 4,
    message: 'Cine anume face ceva diferit? Ce ai vedea concret?',
    why: 'O schimbare fără cine o face nu se poate verifica și nu-ți spune pe cine să cauți.',
  },
  nobody_excluded: {
    title: 'Nimeni exclus',
    step: 5,
    message: 'Cine nu poate folosi asta sau pierde ceva dacă reușești?',
    why: 'Ca să nu construiești doar pentru cei care au deja acces.',
  },
  only_users: {
    title: 'Doar utilizatori',
    step: 5,
    message: 'Cine poate schimba regula din spatele problemei?',
    why: 'Problemele civice se rezolvă de obicei când cineva cu putere schimbă o regulă.',
  },
  powerful_actor_unused: {
    title: 'Actor puternic uitat',
    step: 6,
    message: 'Ministerul X e cel mai puternic din hartă, dar nu apare nicăieri. E aliat, obstacol sau neutru?',
    why: 'Cel mai puternic actor poate debloca sau opri tot; merită să știi de ce parte e.',
  },
  magic_leap: {
    title: 'Salt magic',
    step: 7,
    message: 'De ce ar duce A la B? Ce trebuie să fie adevărat?',
    why: 'Pasul lipsă e de obicei exact locul unde proiectele se blochează.',
  },
  all_through_app: {
    title: 'Totul prin aplicație',
    step: 7,
    message: 'Ce trebuie să se întâmple fără cod? Pe cine trebuie să convingi?',
    why: 'Proiectele civice eșuează mai des din lipsă de relații decât din lipsă de cod.',
  },
  build_and_they_come: {
    title: '„Dacă o construim, vin”',
    step: 7,
    message: 'Cum află primii 50 de oameni de aplicație?',
    why: 'Fără un plan pentru primii utilizatori, aplicația rămâne goală.',
  },
  hypothesis_without_test: {
    title: 'Ipoteză fără test',
    step: 8,
    message: 'Cum ai afla în două săptămâni dacă e adevărat?',
    why: 'Un test de două săptămâni te poate scuti de luni de cod.',
  },
  all_on_one: {
    title: 'Totul pe un om',
    step: 9,
    message: 'Ai marcat că faci tu și lobby, și juridic, și cod, în 4 ore pe săptămână. E realist?',
    why: 'Un singur om pe toate rolurile e primul motiv pentru care proiectele se opresc.',
  },
  orphan_feature: {
    title: 'Feature orfan',
    step: 10,
    message: 'Funcția plănuită «{text}» nu duce încă la niciun pas din drum. La ce ajută? Poate aștepta.',
    why: 'O funcție care nu duce la niciun pas din drum poate aștepta; rămâne timp pentru ce mișcă proiectul acum.',
  },
  only_code: {
    title: 'Doar cod',
    step: 10,
    message: 'Ce trebuie făcut în afara codului: întâlniri, parteneriate, teste cu oameni?',
    why: 'Întâlnirile și testele cu oameni sunt de obicei pașii care deblochează restul.',
  },
};

/**
 * Alerts shown as open questions (UX spec §5.1). The other code alerts are recommended rows of the
 * step's "Ce cere pasul" checklist instead; they keep their Alert records for the public page.
 */
export const QUESTION_CODES: readonly AlertCode[] = [
  'team_no_time',
  'all_on_one',
  'solution_in_problem',
  'app_as_goal',
  'abstract_change',
  'magic_leap',
  'build_and_they_come',
];

export const isQuestionAlert = (code: AlertCode) => QUESTION_CODES.includes(code);

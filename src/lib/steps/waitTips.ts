import type { StepId } from '../project/schema';

/**
 * Short ideas about structuring impact, shown while the AI works: first the ones for the step,
 * then general ones. Each fits on two lines; they come from the step guide (docs/ux/2026-10-24-ghidare-spec.md).
 */
const BY_STEP: Record<StepId, string[]> = {
  project: [
    'Scrie o funcție ca ce poate face omul cu ea, nu ca tehnologia din spate.',
    'Funcțiile care merg deja sunt realizări (outputs) pe care se sprijină tot drumul.',
    'Orele dintr-o săptămână obișnuită, nu dintr-una bună, fac planul realist.',
  ],
  problem: [
    '„Nu există o aplicație care…” e soluția văzută din partea ta. Problema e ce pățesc oamenii azi.',
    'Numește oamenii („părinții din Sectorul 3”), nu „cetățenii”.',
    'Cea mai ieftină dovadă: o discuție cu 3 oameni care au problema.',
    'Întreabă „de ce?” de trei ori, până ajungi la cauza pe care o poți atinge.',
  ],
  existing: [
    'Aproape niciodată nu ești primul din lume. Caută în Civic Tech Field Guide.',
    'Uneori „concurența” e un tabel Excel al unui ONG sau un grup de Facebook.',
    'Cine a încercat înaintea ta poate deveni partener, nu rival.',
  ],
  target: [
    'Testul jurnalistului: ce titlu ar scrie ziarul local peste doi ani, dacă reușești?',
    'Un rezultat pe termen lung e un actor + un comportament nou: cine face ce diferit.',
    '„Oamenii folosesc aplicația” e o realizare (output), nu încă o schimbare.',
    'Un indicator bun spune: cine, câți, cât și până când.',
  ],
  actors: [
    'Schimbarea se întâmplă prin oameni și instituții. Rezultatele sunt comportamentele lor.',
    'Puterea reală nu se citește din titlul funcției. Uneori decide un șef de birou.',
    'Întreabă: cine ar fi deranjat dacă reușim?',
    'Nu uita de cei afectați, dar fără putere: oamenii fără smartphone, vârstnicii.',
  ],
  relations: [
    'Urmărește trei fire: banii, datele, deciziile.',
    'Pornește de la cine decide rezultatul și întreabă: cine are acces la el?',
    'Relațiile arată pârghiile: pe cine poți mișca ca să ajungi la cine decide.',
  ],
  preconditions: [
    'Construim drumul invers: de la rezultat, întrebăm ce trebuie să fie adevărat chiar înainte.',
    'Citește drumul cu „ca să…”. Dacă sună a salt, lipsește un pas.',
    'O barieră întoarsă devine un pas: „nu au consecințe” → „există consecințe”.',
    'Fiecare drum pornește de la ceva ce livrați voi și puteți număra.',
    'De obicei ajung 2–3 pași sub rezultatul pe termen lung.',
  ],
  risks: [
    'Planurile cad la săgeți, nu la cutii. Acolo stau ipotezele.',
    'Pre-mortem: e anul viitor și n-a mers. Primele trei motive sunt ipotezele tale riscante.',
    '„Lansăm și vedem” e cel mai scump test posibil.',
    'O cerere pe Legea 544 sau 5 discuții sunt teste excelente, fără cod.',
  ],
  roles: [
    'Un dev singur nu poate face și lobby, și drept, și organizare de comunitate.',
    'Cere puțin și concret: „2 ore pe lună” primește mai ușor un „da”.',
    'Un ONG partener poate aduce un rol gata făcut.',
  ],
  backlog: [
    'Fiecare activitate produce o realizare din hartă; altfel e muncă fără direcție.',
    'Cel mult 3 activități în lucru deodată.',
    'Prima activitate ar trebui să încapă în săptămâna asta.',
  ],
};

const GENERAL = [
  'Lanțul teoriei schimbării: activități → realizări (outputs) → rezultate (outcomes) → impact.',
  'Controlezi ce faci și ce livrezi. Ce fac alții doar influențezi. La impact doar contribui.',
  'O teorie a schimbării bună e plauzibilă, fezabilă și testabilă.',
  'Harta nu e finală: o revizuiești când afli ceva nou.',
];

/** The tips for a step, then the general ones. */
export const waitTips = (step: StepId): string[] => [...BY_STEP[step], ...GENERAL];

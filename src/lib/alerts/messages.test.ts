import { describe, expect, it } from 'vitest';
import { AlertCodeSchema } from '../project/schema';
import { ALERT_MESSAGES, isQuestionAlert, QUESTION_CODES } from './messages';

describe('ALERT_MESSAGES', () => {
  it('every code has a "De ce contează" line', () => {
    for (const code of AlertCodeSchema.options) expect(ALERT_MESSAGES[code].why.trim(), code).not.toBe('');
    expect(ALERT_MESSAGES.team_no_time.why).toBe('Cu puține ore, contează mai mult ce alegi să nu faci în primele 3 luni.');
    expect(ALERT_MESSAGES.orphan_feature.why).toBe(
      'O funcție care nu duce la niciun pas din drum poate aștepta; rămâne timp pentru ce mișcă proiectul acum.',
    );
  });

  it('only the team, all-on-one and LLM alerts are questions', () => {
    expect([...QUESTION_CODES].sort()).toEqual(
      ['abstract_change', 'all_on_one', 'app_as_goal', 'build_and_they_come', 'magic_leap', 'solution_in_problem', 'team_no_time'].sort(),
    );
    expect(isQuestionAlert('no_evidence')).toBe(false);
    expect(isQuestionAlert('magic_leap')).toBe(true);
  });
});

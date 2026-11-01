import { describe, expect, it } from 'vitest';
import { precondition } from '../steps/completion.fixtures';
import { createEmptyProject } from './empty';
import { indicatorLine, isKeyMeasureSet, liveMeasures, measureFor, measureState, type Measure } from './measures';

function withMeasures(list: Measure[]) {
  const p = createEmptyProject('P');
  p.preconditions = [{ ...precondition }];
  p.targetChanges = [{ id: 't1', text: 'T', signal: '' }];
  p.measures = list;
  return p;
}

const key: Measure = { id: 'ms1', role: 'key', stepId: 'p1', what: '% cereri cu răspuns' };
const full: Measure = { ...key, source: 's', counts: 'c', routine: 'r', enough: 'e', ifBelow: 'i' };

describe('isKeyMeasureSet', () => {
  it('needs a key measure with text, tied to a pathway step', () => {
    expect(isKeyMeasureSet(withMeasures([key]))).toBe(true);
    expect(isKeyMeasureSet(withMeasures([{ ...key, what: '   ' }]))).toBe(false);
    expect(isKeyMeasureSet(withMeasures([{ ...key, stepId: 'nu-exista' }]))).toBe(false);
    // a long-term result is not a step on the path
    expect(isKeyMeasureSet(withMeasures([{ ...key, stepId: 't1' }]))).toBe(false);
    expect(isKeyMeasureSet(withMeasures([{ ...key, role: 'delivery' }]))).toBe(false);
  });
});

describe('measureState', () => {
  it('is clear only with the full definition and a baseline or a first check', () => {
    expect(measureState(key)).toBe('sketch');
    expect(measureState(full)).toBe('sketch');
    expect(measureState({ ...full, today: '0' })).toBe('clear');
    expect(measureState({ ...full, firstCheck: 'probă' })).toBe('clear');
    expect(measureState({ ...full, today: '0', role: 'delivery' })).toBeNull();
  });
});

describe('liveMeasures / measureFor', () => {
  it('drops measures whose step is gone', () => {
    expect(liveMeasures(withMeasures([{ ...key, stepId: 'sters' }]))).toEqual([]);
    expect(liveMeasures(withMeasures([{ ...key, role: 'longTerm', stepId: 't1' }])).length).toBe(1);
    expect(measureFor(withMeasures([key]), 'p1')?.id).toBe('ms1');
    expect(measureFor(withMeasures([key]), 'p2')).toBeUndefined();
  });
});

describe('indicatorLine', () => {
  it('prefers the measure of the step, then the free indicator, then nothing', () => {
    const p = withMeasures([key]);
    expect(indicatorLine(p, 'p1', 'semnal')).toBe('Urmărim: % cereri cu răspuns');
    expect(indicatorLine(p, 'p1', undefined)).toBe('Urmărim: % cereri cu răspuns');
    expect(indicatorLine(withMeasures([]), 'p1', 'semnal')).toBe('Indicator: semnal');
    expect(indicatorLine(withMeasures([]), 'p1', '  ')).toBeNull();
    expect(indicatorLine(withMeasures([]), 'p1', undefined)).toBeNull();
  });

  it('falls back to the indicator when the measure’s step was deleted', () => {
    const p = withMeasures([{ ...key, stepId: 'sters' }]);
    expect(indicatorLine(p, 'sters', 'semnal')).toBe('Indicator: semnal');
  });
});

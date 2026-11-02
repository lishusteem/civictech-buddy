import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadPrompt } from './prompts';

const text = loadPrompt('steps/measures.md');

describe('the measures prompt', () => {
  it('says what happens on the third „Nu știu”, and that „De aflat” is only for today', () => {
    expect(text).toContain('a treia oară treci mai departe și lași câmpul gol');
    expect(text).toContain('„De aflat” e doar pentru `today`, niciodată pentru celelalte întrebări');
  });

  it('steers the key measure toward a result, gently', () => {
    expect(text).toContain('E recomandat un rezultat, dar accepți și o realizare dacă echipa insistă.');
    expect(text).toContain('Ce ar face altcineva diferit dacă merge?');
  });

  it('shows one measure template per role, with distinct ids and the right step', () => {
    const lines = text.split(/\r?\n/).filter((l) => l.startsWith('- {"kind": "measure"'));
    expect(lines.map((l) => /"role": "(\w+)"/.exec(l)?.[1])).toEqual(['key', 'delivery', 'longTerm']);
    expect(new Set(lines.map((l) => /"id": "(\w+)"/.exec(l)?.[1])).size).toBe(3);
    expect(lines[0]).toContain('pas din drum');
    expect(lines[1]).toContain('realizare');
    expect(lines[2]).toContain('rezultat pe termen lung');
    expect(lines[1]).not.toContain('counts');
    expect(lines[2]).not.toContain('counts');
  });

  it('gives no id to a toFindOut template', () => {
    expect(text).toContain('{"kind": "toFindOut", "data": {"id": "", "step": "measures"');
  });

  it('is copied verbatim into docs/prompturi-ai.md', () => {
    const docs = readFileSync(join(process.cwd(), 'docs/prompturi-ai.md'), 'utf8').replace(/\r\n/g, '\n');
    expect(docs).toContain(text.replace(/\r\n/g, '\n').trim());
  });
});

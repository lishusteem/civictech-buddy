// Manual smoke test against the real DeepSeek API (not run in CI).
// Usage: put DEEPSEEK_API_KEY (and optionally DEEPSEEK_MODEL, DEEPSEEK_BASE_URL)
// in .env.local, then: npx tsx --env-file=.env.local scripts/smoke-ai.ts
// Expected: a `question` turn in Romanian for the `problem` step.
import fs from 'node:fs';
import { createEmptyProject } from '../src/lib/project/empty';
import { DeepSeekProvider } from '../src/lib/ai/provider';
import { buildMessages } from '../src/lib/ai/prompts';
import { runStepTurn } from '../src/lib/ai/stepTurn';

function loadEnvLocal() {
  if (!fs.existsSync('.env.local')) return;
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

async function main() {
  loadEnvLocal();
  if (!process.env.DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY lipsește');

  const p = createEmptyProject('Harta parcurilor');
  p.project.description = 'O hartă cu locurile de joacă din Cluj și starea lor.';
  p.features = [{ id: 'f1', text: 'Hartă cu locurile de joacă' }, { id: 'f2', text: 'Raportare de probleme' }];
  const chat = [{ role: 'user' as const, content: 'Salut, hai să începem pasul ăsta.' }];

  const provider = new DeepSeekProvider();
  // Raw call first, so we see whether the model accepts response_format: json_object.
  const raw = await provider.complete(buildMessages(p, 'problem', chat));
  console.log('RAW:', raw);

  const turn = await runStepTurn(p, 'problem', chat, provider);
  console.log('TURN:', JSON.stringify(turn, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

// Evaluates the decision model on labeled cases the way the bot uses it (exact match short-circuit,
// same media rendering): per-case score, accuracy, precision/recall, latency and best threshold.
// Usage: JUDGE_URL=http://127.0.0.1:8080 node scripts/eval-judge.js [cases.json]
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { judgeScore } from '../src/judge/client.js';
import { renderText } from '../src/judge/context.js';
import { buildPredictMessages, buildCounterMessages } from '../src/judge/prompts.js';
import { normalizeForMatch } from '../src/util/normalize.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const casesPath = process.argv[2] ?? resolve(__dirname, 'judge-cases.json');
const cases = JSON.parse(readFileSync(casesPath, 'utf8'));
const accept = Number(process.env.JUDGE_ACCEPT || 0.5);

// Context entries are [author, content, isTarget?, isAuthorLast?]; without the flag, the last message is the target.
const isTarget = (c, entry, i) => (entry.length > 2 ? entry[2] : i === c.context.length - 1);
const targetTexts = (c) => c.context.filter((e, i) => isTarget(c, e, i)).map((e) => e[1]);

function isExact(c) {
  const answers = c.type === 'counter' ? [c.counter] : targetTexts(c);
  return answers.some((a) => normalizeForMatch(a) === normalizeForMatch(c.prediction));
}

function messagesFor(c) {
  if (c.type === 'counter') return buildCounterMessages(c);
  const context = c.context.map((entry, i) => ({
    author: entry[0],
    content: renderText(entry[1]) || '[message vide]',
    isTarget: isTarget(c, entry, i),
    isAuthorLast: entry[3] === true,
  }));
  return buildPredictMessages({ context, prediction: c.prediction, authorName: c.author, targetName: c.target });
}

const results = [];
for (const c of cases) {
  const start = Date.now();
  const score = isExact(c) ? 1 : await judgeScore(messagesFor(c));
  const ms = Date.now() - start;
  if (score === null) {
    console.error('Judge unavailable, aborting.');
    process.exit(1);
  }
  results.push({ ...c, score, ms });
  const ok = score >= accept === c.expected;
  const label = c.type === 'counter' ? `${c.prediction} ~ ${c.counter}` : `${c.prediction} <- ${targetTexts(c).map(renderText).join(' / ')}`;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${score.toFixed(3)} exp=${c.expected ? 'oui' : 'non'} ${String(ms).padStart(6)}ms  [${c.id ?? c.type}] ${label.slice(0, 140)}`);
}

const accuracy = (t) => results.filter((r) => r.score >= t === r.expected).length / results.length;
const latencies = results.filter((r) => r.ms > 5).map((r) => r.ms).sort((a, b) => a - b);
const pct = (p) => latencies[Math.min(latencies.length - 1, Math.floor(p * latencies.length))];

const tp = results.filter((r) => r.score >= accept && r.expected).length;
const fp = results.filter((r) => r.score >= accept && !r.expected).length;
const fn = results.filter((r) => r.score < accept && r.expected).length;

let best = { t: accept, acc: accuracy(accept) };
for (let t = 0.05; t < 1; t += 0.05) {
  const acc = accuracy(t);
  if (acc > best.acc) best = { t, acc };
}

console.log(`\naccuracy @${accept}: ${(accuracy(accept) * 100).toFixed(1)}% (${results.length} cases)`);
console.log(`validated: ${tp + fp} (true ${tp}, false ${fp}) | missed: ${fn} | precision ${(tp / (tp + fp || 1) * 100).toFixed(0)}% recall ${(tp / (tp + fn || 1) * 100).toFixed(0)}%`);
console.log(`best threshold: ${best.t.toFixed(2)} -> ${(best.acc * 100).toFixed(1)}%`);
console.log(`latency p50=${pct(0.5)}ms p95=${pct(0.95)}ms (model calls only; first call includes system prompt prefill)`);

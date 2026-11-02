import { normalizeForMatch } from '../util/normalize.js';
import { judgeScore } from './client.js';
import { buildContext } from './context.js';
import { buildPredictMessages, buildCounterMessages } from './prompts.js';

export { fetchHistory } from './context.js';

const JUDGE_ENABLED = process.env.JUDGE_ENABLED !== 'false';
// Tuned on scripts/judge-cases.json with gemma-3n-E4B: "non" cases score < 0.25 (two edge
// cases at 0.86), "oui" cases > 0.9. 0.5 keeps a wide margin on both sides.
const JUDGE_ACCEPT = Number(process.env.JUDGE_ACCEPT || 0.5);

// Exact match short-circuits the model; if the judge is down we fall back to exact match.
async function decide(label, exact, messages) {
  if (exact || !JUDGE_ENABLED) return exact;
  const start = Date.now();
  const score = await judgeScore(messages);
  if (score === null) return false;
  const accepted = score >= JUDGE_ACCEPT;
  console.log(`[judge] ${label} score=${score.toFixed(3)} accepted=${accepted} (${Date.now() - start}ms)`);
  return accepted;
}

export async function isPredictFulfilled(message, row, history) {
  const exact = normalizeForMatch(message.content) === normalizeForMatch(row.content);
  const author = await message.guild.members.fetch(row.authorId).catch(() => null);
  const messages = buildPredictMessages({
    context: buildContext(history, message, row),
    prediction: row.content,
    authorName: author?.displayName ?? "l'auteur",
    targetName: message.member?.displayName ?? message.author.username,
  });
  return decide(`predict #${row.id}`, exact, messages);
}

// The first call after the judge starts processes the whole static prefix (~30 s on the
// OCI box); do it at startup so real judgements only pay for their own context.
export async function warmUpJudge() {
  if (!JUDGE_ENABLED) return;
  const context = [{ author: 'A', content: 'salut' }, { author: 'B', content: 'yo', isTarget: true }];
  await judgeScore(buildPredictMessages({ context, prediction: 'va dire bonjour', authorName: 'A', targetName: 'B' }), 120000);
  await judgeScore(buildCounterMessages({ prediction: 'va dire bonjour', counter: 'yo' }), 120000);
  console.log('[judge] warmed up');
}

export async function isCounterMatch(counter, prediction) {
  const exact = normalizeForMatch(counter) === normalizeForMatch(prediction);
  return decide('counter', exact, buildCounterMessages({ prediction, counter }));
}

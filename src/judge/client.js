// Client for the local decision model (llama.cpp `llama-server`, OpenAI-compatible API).
// Jev-style: we generate a single token and read the probability of "oui" vs "non".

const JUDGE_URL = process.env.JUDGE_URL || 'http://127.0.0.1:8080';
const JUDGE_TIMEOUT_MS = Number(process.env.JUDGE_TIMEOUT_MS || 15000);

const YES_TOKENS = new Set(['oui', 'yes']);
const NO_TOKENS = new Set(['non', 'no']);

// Returns P(oui) / (P(oui) + P(non)) in [0, 1], or null if the judge is unavailable.
export async function judgeScore(messages, timeoutMs = JUDGE_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${JUDGE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        messages,
        max_tokens: 1,
        temperature: 0,
        logprobs: true,
        top_logprobs: 20,
        cache_prompt: true,
        chat_template_kwargs: { enable_thinking: false },
      }),
    });
    if (!res.ok) {
      console.error(`[judge] HTTP ${res.status}: ${await res.text()}`);
      return null;
    }
    const data = await res.json();
    const top = data.choices?.[0]?.logprobs?.content?.[0]?.top_logprobs ?? [];

    let pYes = 0;
    let pNo = 0;
    for (const { token, logprob } of top) {
      const t = token.trim().toLowerCase();
      if (YES_TOKENS.has(t)) pYes += Math.exp(logprob);
      else if (NO_TOKENS.has(t)) pNo += Math.exp(logprob);
    }
    if (pYes + pNo === 0) {
      console.error('[judge] neither oui nor non in top logprobs:', top.map((x) => x.token));
      return null;
    }
    return pYes / (pYes + pNo);
  } catch (err) {
    console.error(`[judge] unavailable (${err.name === 'AbortError' ? 'timeout' : err.message})`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

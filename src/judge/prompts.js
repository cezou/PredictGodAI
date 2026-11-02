// Prompts for the decision model. The system prompt and the few-shot turns are static so
// llama-server keeps them in its KV cache: only the final user turn is re-processed per call.
// Few-shots are real user/assistant turns built with the same format as the real query.

const PREDICT_SYSTEM = `Les messages >>> CIBLE réalisent-ils la prédiction ?
Oui s'ils veulent dire la même chose (paraphrase, synonyme, argot) ou font l'action prédite. Sinon non.
[GIF : titre] = un GIF, son titre donne son sens.`;

const COUNTER_SYSTEM = `Les deux phrases veulent-elles dire la même chose (paraphrase, synonyme, argot, ou une phrase qui fait l'action décrite) ?`;

// [prediction, [[author, content], ...] (last = target), answer]
const PREDICT_EXAMPLES = [
  ["va m'insulter", [['Alex', 'ton deck il est éclaté'], ['Sam', 'allez ferme ta gueule']], 'oui'],
  ['connard', [['Noa', 'Sam t’es un connard'], ['Alex', 'mdrr'], ['Sam', 'bon on lance la game ?']], 'non'],
  ['trop gênant', [['Alex', "j'ai chanté au karaoké devant ma boss"], ['Sam', 'quel malaise frérot']], 'oui'],
  ['ouais grave', [['Alex', 'on commande des pizzas ?'], ['Sam', 'ouais mais pas ce soir']], 'non'],
  ['ta gueule', [['Alex', 'je suis meilleur que toi à fifa'], ['Sam', '[GIF : aller ferme ta guele bassem]']], 'oui'],
  ['non', [['Alex', 'tu viens samedi ?'], ['Sam', '[GIF : homer simpson]']], 'non'],
  ['va envoyer un gif', [['Alex', 'raconte ta soirée'], ['Sam', '[GIF : spongebob tired]']], 'oui'],
  ["c'est une arnaque ce jeu", [['Alex', 'le jeu est à 80 balles'], ['Sam', "c'est cher mais il a l'air bien"]], 'non'],
  ['salut', [['Alex', 'yo'], ['Sam', 'wesh bien ou quoi']], 'oui'],
  ['va refuser', [['Alex', 'foot demain 18h ?'], ['Sam', 'grave go']], 'non'],
];

// [prediction, counter, answer]
const COUNTER_EXAMPLES = [
  ["va m'insulter", 'ferme ta gueule', 'oui'],
  ["va m'insulter", 'va me complimenter', 'non'],
  ['va rigoler', 'mdr', 'oui'],
  ['va refuser', 'il va accepter', 'non'],
  ["va dire qu'il a faim", 'on mange quand', 'oui'],
  ['va parler de valo', 'va parler de foot', 'non'],
];

function quote(text) {
  return `« ${text.replace(/\s+/g, ' ').trim()} »`;
}

// context: [{ author, content, isTarget, isAuthorLast }] ordered oldest → newest.
function predictUserTurn({ context, prediction }) {
  const lines = context.map((m) => `${m.isTarget ? '>>> CIBLE ' : m.isAuthorLast ? '>>> AUTEUR ' : ''}[${m.author}] ${m.content}`);
  return `${lines.join('\n')}\n\nPrédiction : ${quote(prediction)}`;
}

function counterUserTurn({ prediction, counter }) {
  return `${quote(prediction)}\n${quote(counter)}`;
}

function withExamples(system, examples, userTurn) {
  return [
    { role: 'system', content: system },
    ...examples.flatMap(([turn, answer]) => [
      { role: 'user', content: turn },
      { role: 'assistant', content: answer },
    ]),
    { role: 'user', content: userTurn },
  ];
}

// In each example the predictor is the first speaker and the target the last one.
const PREDICT_SHOTS = PREDICT_EXAMPLES.map(([prediction, lines, answer]) => {
  const authorName = lines[0][0];
  const authorLast = lines.findLastIndex(([author], i) => author === authorName && i < lines.length - 1);
  return [
    predictUserTurn({
      context: lines.map(([author, content], i) => ({
        author,
        content,
        isTarget: i === lines.length - 1,
        isAuthorLast: i === authorLast,
      })),
      prediction,
      authorName,
      targetName: lines.at(-1)[0],
    }),
    answer,
  ];
});

const COUNTER_SHOTS = COUNTER_EXAMPLES.map(([prediction, counter, answer]) => [
  counterUserTurn({ prediction, counter }),
  answer,
]);

export function buildPredictMessages(args) {
  return withExamples(PREDICT_SYSTEM, PREDICT_SHOTS, predictUserTurn(args));
}

export function buildCounterMessages(args) {
  return withExamples(COUNTER_SYSTEM, COUNTER_SHOTS, counterUserTurn(args));
}

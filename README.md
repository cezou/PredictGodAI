# PredictGodAI

PredictGodAI is a Discord bot that allows users to make hidden predictions about what someone is about to say or how someone will react.

## Commands

- `/predict <target> <prediction>` — Create a new hidden prediction.
  - **`target`** *(Required)*: The person to predict.
  - **`prediction`** *(Required)*: A message, or a single emoji to predict a reaction.
- `/counterpredict <target> <predictiontocounter> <originalpredictiontarget>` — Make a counter-prediction against an existing one.
  - **`target`** *(Required)*: The person whose prediction you are countering.
  - **`predictiontocounter`** *(Required)*: The counter prediction message.
  - **`originalpredictiontarget`** *(Optional)*: The person they are predicting (defaults to yourself).

## Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd PredictGodAI
   ```

2. **Install dependencies:**
   Make sure you are using Node.js v20 or later.
   ```bash
   npm install
   ```

3. **Environment Variables:**
   Copy the `.env.example` file to `.env` and fill in your Discord bot token and client ID.
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file and add your credentials.

4. **Run the bot locally:**
   ```bash
   npm run start
   ```

## Predict validation (local decision model)

A predict is validated on its **substance**, not its exact wording: `/predict @x va m'insulter` is validated if `@x` writes `allez ferme ta gueule`. Counter-predicts are compared to the predict the same way.

- When the target writes in the channel, the bot builds a context: the 5 messages before the predictor's last message, everything up to the target's message, then that message (max 20 messages / 30 min). Without a predictor message: the 5 messages before the target's message.
- A small local LLM ([llama.cpp](https://github.com/ggml-org/llama.cpp) `llama-server`, default `gemma-3n-E4B-it-Q4_0`, ~3 GB RAM, ~2.4 s per judgement on the OCI Ampere A1, 97 % on `scripts/judge-cases.json`) answers "oui"/"non" in one token. The score is `P(oui) / (P(oui) + P(non))`, and the predict is validated when `score >= JUDGE_ACCEPT`.
- An exact match is validated without calling the model. If the model is unreachable, the bot falls back to exact matching.

Environment variables (all optional):

| Variable | Default | Description |
| --- | --- | --- |
| `JUDGE_ENABLED` | `true` | `false` = exact matching only |
| `JUDGE_URL` | `http://127.0.0.1:8080` | `llama-server` URL |
| `JUDGE_ACCEPT` | `0.5` | Score threshold to validate a predict |
| `JUDGE_TIMEOUT_MS` | `15000` | Timeout per judgement |
| `PREDICT_TTL_HOURS` | `24` | An unresolved predict expires after this delay (it no longer triggers nor blocks a new predict) |

Run the model on the server once with `./scripts/setup-judge.sh` (downloads the model and starts the `predictgod-judge` container on the `predictgod` Docker network). Evaluate a model / tune the threshold with `JUDGE_URL=... node scripts/eval-judge.js`.

## Available Scripts

- `npm run start` — Starts the bot and syncs the database and slash commands automatically.
- `npm run format` — Formats code using Prettier.

## Technologies Used

- [Node.js](https://nodejs.org/en/) (v20+)
- [discord.js](https://discord.js.org/) (v14)
- [Sequelize](https://sequelize.org/) (SQLite3)
- [Sharp](https://sharp.pixelplumbing.com/) (Image generation)

## Continuous Deployment

The bot is set up for continuous deployment using GitHub Actions. Whenever you push changes to the `main` branch, the bot will automatically deploy to the hosting service (e.g., Heroku, AWS, etc.) that you have configured.
The selected platform is arm64 compatible, so make sure to edit the deployment workflow to build for the correct architecture if needed.

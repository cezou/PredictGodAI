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

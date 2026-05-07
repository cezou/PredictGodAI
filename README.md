# PredictGodAI

PredictGodAI is a Discord bot that allows users to make hidden predictions about what someone is about to say or how someone will react.

## Features

- **Hidden predictions:** Make predictions using slash commands without revealing them.
- **Counter-predictions:** Predict that a prediction will not happen.
- **Event tracking:** Monitors messages and reactions to validate or deny predictions.
- **Auto-deployment:** Automatically syncs slash commands on startup.
- **Database:** Local SQLite database with Sequelize.

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
   Create a `.env` file in the root directory and add your Discord bot credentials:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_client_id_here
   ```

4. **Run the bot:**
   ```bash
   npm run start
   ```

## Available Scripts

- `npm run start` — Starts the bot and syncs the database and slash commands automatically.
- `npm run deploy` — Deploys slash commands manually.
- `npm run format` — Formats code using Prettier.

## Commands

- `/predict <target> <prediction>` — Create a new hidden prediction.
  - **`target`** *(Required)*: The person to predict.
  - **`prediction`** *(Required)*: A message, or a single emoji to predict a reaction.
- `/counterpredict <target> <predictiontocounter> <originalpredictiontarget>` — Make a counter-prediction against an existing one.
  - **`target`** *(Required)*: The person whose prediction you are countering.
  - **`predictiontocounter`** *(Required)*: The counter prediction message.
  - **`originalpredictiontarget`** *(Optional)*: The person they are predicting (defaults to yourself).

## Technologies Used

- [Node.js](https://nodejs.org/en/) (v20+)
- [discord.js](https://discord.js.org/) (v14)
- [Sequelize](https://sequelize.org/) (SQLite3)
- [Sharp](https://sharp.pixelplumbing.com/) (Image generation)

## Docker Deployment (Optional)

You can use the provided `Dockerfile` and `deploy.sh` script to run the bot in a containerized environment if needed.
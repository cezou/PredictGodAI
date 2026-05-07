# PredictGodAI

> "I knew you were gonna say that" solver

A Discord bot for hidden predictions. Predict what someone is about to say in a channel — nobody knows about it, and when the target speaks the bot reveals your prediction publicly.

## How it works

- `/predict target:@someone prediction:"what they'll say or an emoji"`
  - Predict a text message or a specific reaction (emoji) the target will use.
  - The command is silent for everyone except you (ephemeral reply).
  - On the **target's first text message or reaction** in **the same channel**, the bot posts an embed revealing the prediction.
- `/counterpredict target:@someone predictiontocounter:"what they predicted"`
  - Actively counter a prediction made by someone else against you!
  - If they already predicted it, the counter applies instantly and fires a special dunking GIF in the chat.
  - If you set it up first, it stays hidden until they attempt to predict it.
- **1 active predict max** per (author, target, channel, type).
- **Daily limit per author** (configurable, default 4, currently disabled in code via `DAILY_LIMIT_ENABLED`). Reset at midnight Europe/Paris. Beyond limit: `You're cooked chief, try again tomorrow 💀`.

## Setup

### 1. Create the Discord application

1. Go to https://discord.com/developers/applications → **New Application** → name: `PredictGodAI`.
2. **Bot** tab → **Reset Token** → copy the token (= `DISCORD_TOKEN`).
3. **General Information** tab → copy the **Application ID** (= `CLIENT_ID`).
4. **Bot** tab → no need to enable _Privileged Intents_.
5. **OAuth2 → URL Generator**:
   - scopes: `bot`, `applications.commands`
   - bot permissions: `View Channels`, `Send Messages`, `Embed Links`, `Read Message History`
   - copy the generated URL and invite the bot to your server.

### 2. Configure the environment

Create a `.env` file at the project root:

```
DISCORD_TOKEN=your_token_here
CLIENT_ID=your_application_id_here
GUILD_ID=your_test_server_id
```

> `GUILD_ID` is optional but **recommended in dev**: the `/predict` command appears instantly on that server. Without `GUILD_ID`, the command is registered globally and may take up to 1h to appear.
> To get a server ID: Discord → Settings → Advanced → enable **Developer Mode**, then right-click the server → _Copy Server ID_.

### 3. Install and run

```bash
npm install
npm run deploy   # registers the slash command (re-run after command changes)
npm start        # starts the bot
```

You should see: `Logged in as PredictGodAI#xxxx`.

## Testing

1. **Text Predict**: Account A uses `/predict target:@B prediction:"hello"` → ephemeral confirmation, nothing visible in the channel. B sends a message containing "hello" → the bot replies to reveal the prediction.
2. **Reaction Predict**: Account A uses `/predict target:@B prediction:"🔥"` → B reacts with 🔥 on any message → the prediction is revealed.
3. **Counter-Predict**: Account A predicts "loser" against B. Account B uses `/counterpredict target:@A predictiontocounter:"loser"` → Instantly triggers a public Venom dunking GIF in the chat defeating A's prediction.
4. Try `/predict target:@B prediction:"x"` twice in a row in the same channel → second call refused.

## Stack

- Node.js 20+ / discord.js v14
- SQLite (better-sqlite3) — local database in `data/predicts.db`
- Luxon for the daily reset (Europe/Paris)

## Deployment

The project is deployed via **GitHub Actions** using a **Docker** container. When pushing to the `main` branch, the CI/CD pipeline builds the image, pushes it to Docker Hub, and runs it on the target VPS (e.g. Oracle Cloud).

### 1. VPS Setup (Oracle Cloud / Linux)

On your server, ensure Docker is installed and prepare the directory for the bot runtime:

```bash
mkdir -p ~/predictgodai/data
nano ~/predictgodai/.env
```
*(Configure your `.env` file with `DISCORD_TOKEN`, `CLIENT_ID`, etc.)*

Generate an SSH key pair on the server if you don't have one, and add the public key to `~/.ssh/authorized_keys` so GitHub Actions can connect via SSH as your deploy user.

### 2. GitHub Secrets

To enable the automated remote deployment, define the following variables in your GitHub repository's **Settings > Secrets and variables > Actions**:

- `DOCKER_USERNAME`: Your Docker Hub username.
- `DOCKER_PASSWORD`: A Docker Hub Personal Access Token.
- `SERVER_IP`: The public IP of your VPS.
- `SERVER_USER`: The SSH user (e.g., `ubuntu` or `opc`).
- `SSH_PRIVATE_KEY`: The private SSH key corresponding to the public key authorized on the server.

Once configured, pushing to `main` will automatically build, pull, and run the latest image. The SQLite database is stored in a named bind volume mapped to `~/predictgodai/data` on the host, ensuring your data is safely persisted between container updates.
 
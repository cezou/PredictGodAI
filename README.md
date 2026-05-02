# PredictGodAI

> "I knew you were gonna say that" solver

A Discord bot for hidden predictions. Predict what someone is about to say in a channel — nobody knows about it, and when the target speaks the bot reveals your prediction publicly.

## How it works

- `/predict target:@someone message:"what they'll say"`
- The command is silent for everyone except you (ephemeral reply).
- On the **target's first message** in **the same channel**, the bot posts an embed:
  > **@you predicted**
  > « what they'll say »
- **1 active predict max** per (author, target, channel) tuple.
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

1. Account A: `/predict target:@B message:"hello"` → ephemeral confirmation, nothing visible in the channel.
2. B sends a message → the bot replies with the embed `@A predicted / « hello »`.
3. Try `/predict @B "x"` twice in a row in the same channel → second call refused.

## Stack

- Node.js 20+ / discord.js v14
- SQLite (better-sqlite3) — local database in `data/predicts.db`
- Luxon for the daily reset (Europe/Paris)

## Deployment

Targeted: **Oracle Cloud Always Free** (Linux VM). The bot runs as a systemd service, SQLite lives on the VM disk.

```ini
# /etc/systemd/system/predictgodai.service
[Unit]
Description=PredictGodAI Discord bot
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/PredictGodAI
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=5
EnvironmentFile=/home/ubuntu/PredictGodAI/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now predictgodai
journalctl -u predictgodai -f   # tail logs
```

import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import * as predictCommand from './commands/predict.js';

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('DISCORD_TOKEN et CLIENT_ID requis dans .env');
  process.exit(1);
}

const commands = [predictCommand.data.toJSON()];
const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

const route = GUILD_ID
  ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
  : Routes.applicationCommands(CLIENT_ID);

const scope = GUILD_ID ? `guild ${GUILD_ID}` : 'global';
console.log(`Déploiement de ${commands.length} commande(s) (${scope})...`);

try {
  const data = await rest.put(route, { body: commands });
  console.log(`✅ ${data.length} commande(s) enregistrée(s).`);
} catch (err) {
  console.error('Échec du déploiement :', err);
  process.exit(1);
}

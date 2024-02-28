import Configuration from "../configuration.ts";
import { Client } from "npm:discord.js@14.14.1";

const client = new Client({ intents: [] });

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});
await client.login(Configuration.discordToken);
export default client;

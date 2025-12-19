require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { registerCommands, setupInteractionHandler } = require('./handlers/commandHandler');
const { updateBotStatus } = require('./utils/status');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
    ],
});

const token = process.env.DISCORD_TOKEN;

if (!token) {
    console.error('Error: DISCORD_TOKEN environment variable is not set!');
    console.error('Please create a .env file with your Discord bot token.');
    process.exit(1);
}

setupInteractionHandler(client);

client.once('clientReady', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log(`Bot is ready and online!`);
    
    // Set guildId to a specific guild ID for faster command registration during development
    // Set to null or undefined to register commands globally (takes up to 1 hour to propagate)
    const guildId = '1401598189823590460';
    
    await registerCommands(client.user.id, guildId, token);
    await updateBotStatus(client);
    setInterval(() => updateBotStatus(client), 15 * 60 * 1000);
});

client.login(token).catch((error) => {
    console.error('Error logging in:', error);
    process.exit(1);
});


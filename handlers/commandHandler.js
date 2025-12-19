const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { createEmbed } = require('../utils/embeds');
const { checkPermission } = require('../utils/permissions');

/**
 * Loads all command files from the commands directory
 */
function loadCommands() {
    const commands = [];
    const commandsPath = path.join(__dirname, '../commands');
    
    if (!fs.existsSync(commandsPath)) {
        fs.mkdirSync(commandsPath, { recursive: true });
        console.log('Created commands directory');
        return commands;
    }

    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
            console.log(`Loaded command: ${command.data.name}`);
        } else {
            console.log(`Warning: Command at ${filePath} is missing required "data" or "execute" property.`);
        }
    }

    return commands;
}

/**
 * Registers slash commands with Discord
 */
async function registerCommands(clientId, guildId, token) {
    const commands = loadCommands();
    
    if (commands.length === 0) {
        console.log('No commands found to register.');
        return;
    }

    const rest = new REST().setToken(token);

    try {
        console.log(`Registering ${commands.length} slash command(s)...`);

        // Register commands for a specific guild (faster for testing)
        // For global commands, use Routes.applicationCommands(clientId) instead
        const route = guildId 
            ? Routes.applicationGuildCommands(clientId, guildId)
            : Routes.applicationCommands(clientId);

        const data = await rest.put(route, { body: commands });

        console.log(`Successfully registered ${data.length} slash command(s)!`);
    } catch (error) {
        console.error('Error registering commands:', error);
    }
}

function loadCommandModules() {
    const commandModules = new Map();
    const commandsPath = path.join(__dirname, '../commands');
    
    if (!fs.existsSync(commandsPath)) {
        return commandModules;
    }

    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
            commandModules.set(command.data.name, command);
        }
    }

    return commandModules;
}

/**
 * Sets up the interaction handler for commands
 */
function setupInteractionHandler(client) {
    // Cache command modules on startup
    const commandModules = loadCommandModules();
    
    client.on('interactionCreate', async interaction => {
        if (!interaction.isChatInputCommand()) return;

        const command = commandModules.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        if (interaction.inGuild()) {
            // Use cached member if available, otherwise fetch
            const member = interaction.member || await interaction.guild.members.fetch(interaction.user.id);
            const permissionCheck = checkPermission(member, interaction.commandName);
            
            if (!permissionCheck.allowed) {
                const errorEmbed = createEmbed.error({
                    title: '❌ Permission Denied',
                    description: permissionCheck.reason || 'You do not have permission to use this command.',
                });
                
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                return;
            }
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Error executing command ${interaction.commandName}:`, error);
            
            const errorEmbed = createEmbed.error({
                title: '❌ Command Error',
                description: 'There was an error while executing this command!',
                footer: 'Please try again later or contact support if the issue persists.',
            });
            
            const errorMessage = { embeds: [errorEmbed], ephemeral: true };
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    });
}

module.exports = {
    loadCommands,
    registerCommands,
    setupInteractionHandler
};


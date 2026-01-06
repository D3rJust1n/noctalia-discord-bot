const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { createEmbed } = require('../utils/embeds');
const { saveReactionRole, removeReactionRole, getReactionRoles } = require('../utils/reactionRoles');
const { checkPermission } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rr')
        .setDescription('Manage reaction roles')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a simple reaction role message (use setup for formatted text)')
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Title for the reaction role message')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Description for the reaction role message')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to send the message in')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('plain')
                        .setDescription('Send as plain message instead of embed (better for long/formatted text)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Convert an existing message into a reaction role message')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('ID of the message to convert')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Title for internal tracking')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a role-reaction pair to a reaction role message')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('ID of the reaction role message')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to assign')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('emoji')
                        .setDescription('Emoji to react with (e.g., 🎮 or :custom_emoji:)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a reaction role message')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('ID of the reaction role message to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit the content/title of a reaction role message')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('ID of the reaction role message to edit')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('source_message_id')
                        .setDescription('Message ID to copy content from (multiline-safe)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all active reaction role messages')),
    
    async execute(interaction) {
        // Check if user has Moonwarden role
        const permCheck = checkPermission(interaction.member, 'rr');
        if (!permCheck.allowed) {
            const errorEmbed = createEmbed.error({
                title: '❌ Permission Denied',
                description: permCheck.reason || 'You do not have permission to use this command.',
            });
            await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            return;
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'create':
                    await handleCreate(interaction);
                    break;
                case 'setup':
                    await handleSetup(interaction);
                    break;
                case 'add':
                    await handleAdd(interaction);
                    break;
                case 'remove':
                    await handleRemove(interaction);
                    break;
                case 'edit':
                    await handleEdit(interaction);
                    break;
                case 'list':
                    await handleList(interaction);
                    break;
            }
        } catch (error) {
            console.error('Error executing reactionrole command:', error);
            const errorEmbed = createEmbed.error({
                title: '❌ Error',
                description: 'An error occurred while executing this command.',
            });
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            } else {
                await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }
        }
    },
};

/**
 * Create a new reaction role message
 */
async function handleCreate(interaction) {
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const channel = interaction.options.getChannel('channel');
    const usePlain = interaction.options.getBoolean('plain') || false;

    if (!channel.isTextBased()) {
        const errorEmbed = createEmbed.error({
            title: '❌ Invalid Channel',
            description: 'Please select a text channel.',
        });
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        return;
    }

    try {
        let message;
        
        if (usePlain) {
            // Send as plain message to preserve markdown formatting like ## headers
            const plainContent = `# ${title}\n${description}\n\n*React below to get your roles!*`;
            message = await channel.send(plainContent);
        } else {
            // Send as embed (traditional style)
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(title)
                .setDescription(`${description}\n\n*React below to get your roles!*`)
                .setFooter({ text: 'Click a reaction to add/remove the role' })
                .setTimestamp();
            message = await channel.send({ embeds: [embed] });
        }
        
        // Initialize the reaction role in storage
        await saveReactionRole(message.id, {
            channelId: channel.id,
            guildId: interaction.guild.id,
            title: title,
            roles: {}
        });

        const successEmbed = createEmbed.success({
            title: '✅ Reaction Role Created',
            description: `Message created in ${channel}!\n\n**Message ID:** \`${message.id}\`\n\nUse \`/reactionrole add\` to add role-reaction pairs.`,
        });
        await interaction.reply({ embeds: [successEmbed], flags: MessageFlags.Ephemeral });
    } catch (error) {
        console.error('Error creating reaction role message:', error);
        throw error;
    }
}
/**
 * Set up an existing message as a reaction role message
 */
async function handleSetup(interaction) {
    const messageId = interaction.options.getString('message_id');
    const title = interaction.options.getString('title');

    // Try to fetch the message from the current channel first, then search other channels
    let message;
    let channelId;

    try {
        // Try current channel first
        message = await interaction.channel.messages.fetch(messageId);
        channelId = interaction.channel.id;
    } catch (error) {
        // If not in current channel, ask user to specify or search all text channels
        const errorEmbed = createEmbed.error({
            title: '❌ Message Not Found',
            description: `Could not find message \`${messageId}\` in this channel.\n\nMake sure:\n- You're using this command in the same channel as the message\n- The message ID is correct\n- The bot can see the message`,
        });
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        return;
    }

    // If the message is not from the bot, re-send it as the bot (embed) to preserve formatting/newlines
    const originalMessage = message;
    if (message.author.id !== interaction.client.user.id) {
        try {
            const content = message.content || '';
            if (!content.trim()) {
                const errorEmbed = createEmbed.error({
                    title: '❌ Cannot Re-use Message',
                    description: 'The target message has no text content to copy. Please resend your rules message as text and try again.',
                });
                await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
                return;
            }

            // Repost the message as an embed owned by the bot (keeps newlines/markdown)
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(title)
                .setDescription(`${content}\n\n*React below to get your roles!*`)
                .setFooter({ text: 'Click a reaction to add/remove the role' })
                .setTimestamp();

            const repost = await interaction.channel.send({ embeds: [embed] });
            message = repost;
            channelId = repost.channel.id;

            // Clean up the original message
            try {
                await originalMessage.delete();
            } catch (deleteErr) {
                console.warn('Could not delete original message after setup:', deleteErr?.message || deleteErr);
            }
        } catch (err) {
            console.error('Failed to repost message for setup:', err);
            const errorEmbed = createEmbed.error({
                title: '❌ Repost Failed',
                description: 'I could not copy that message. Please try again or re-send the text yourself and run `/reactionrole setup` on the new message.',
            });
            await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            return;
        }
    }

    // Initialize the reaction role in storage
    await saveReactionRole(message.id, {
        channelId: channelId,
        guildId: interaction.guild.id,
        title: title,
        roles: {}
    });

    const successEmbed = createEmbed.success({
        title: '✅ Reaction Role Set Up',
        description: `Message has been set up as a reaction role message!\n\n**Message ID:** \`${message.id}\`\n**Channel:** <#${channelId}>\n\nUse \`/reactionrole add\` to add role-reaction pairs.`,
    });
    await interaction.reply({ embeds: [successEmbed], flags: MessageFlags.Ephemeral });
}


/**
 * Edit an existing reaction role message (title/description/content)
 */
async function handleEdit(interaction) {
    const messageId = interaction.options.getString('message_id');
    const sourceMessageId = interaction.options.getString('source_message_id');

    const reactionRoles = await getReactionRoles();
    const rrData = reactionRoles[messageId];
    if (!rrData) {
        const errorEmbed = createEmbed.error({
            title: '❌ Message Not Found',
            description: 'This message ID is not registered as a reaction role message.',
        });
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        return;
    }

    try {
        // Fetch target message
        const channel = await interaction.client.channels.fetch(rrData.channelId);
        const message = await channel.messages.fetch(messageId);

        // Find source message: try target channel first, then scan guild text channels
        let src = null;
        try {
            src = await channel.messages.fetch(sourceMessageId);
        } catch (_) {
            // scan other text channels
            const guild = interaction.guild;
            for (const [, ch] of guild.channels.cache) {
                if (!ch.isTextBased?.() || ch.id === channel.id) continue;
                try {
                    const candidate = await ch.messages.fetch(sourceMessageId);
                    src = candidate;
                    break;
                } catch (_) {
                    continue;
                }
            }
        }

        if (!src) {
            const errorEmbed = createEmbed.error({
                title: '❌ Source Not Found',
                description: 'Could not find the source message. Make sure the ID is correct and I can see that channel.',
            });
            await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            return;
        }

        // Extract content from source
        let newTitle = rrData.title;
        let newDescription = '';
        if (src.embeds?.length) {
            const srcEmbed = src.embeds[0];
            newDescription = srcEmbed.description ?? src.content ?? '';
            if (srcEmbed.title) newTitle = srcEmbed.title;
        } else {
            newDescription = src.content ?? '';
        }

        // If message has an embed, update the first embed; otherwise edit content
        if (message.embeds && message.embeds.length > 0) {
            const current = message.embeds[0];
            const updated = EmbedBuilder.from(current);

            if (newTitle) updated.setTitle(newTitle);
            if (newDescription) updated.setDescription(newDescription + '\n\n*React below to get your roles!*');

            await message.edit({ embeds: [updated] });
        } else {
            const content = newDescription || message.content || '';
            await message.edit(content);
        }

        // Persist new title
        if (newTitle) {
            rrData.title = newTitle;
            await saveReactionRole(messageId, rrData);
        }

        const successEmbed = createEmbed.success({
            title: '✅ Message Updated',
            description: 'The reaction role message has been updated.',
        });
        await interaction.reply({ embeds: [successEmbed], flags: MessageFlags.Ephemeral });
    } catch (error) {
        console.error('Error updating reaction role message:', error);
        const errorEmbed = createEmbed.error({
            title: '❌ Update Failed',
            description: 'Could not update that message. Make sure I can see and edit it.',
        });
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
}


/**
 * Add a role-reaction pair to an existing message
 */
async function handleAdd(interaction) {
    const messageId = interaction.options.getString('message_id');
    const role = interaction.options.getRole('role');
    const emojiInput = interaction.options.getString('emoji');

    // Check if the message exists in storage
    const reactionRoles = await getReactionRoles();
    if (!reactionRoles[messageId]) {
        const errorEmbed = createEmbed.error({
            title: '❌ Message Not Found',
            description: 'This message ID is not registered as a reaction role message.',
        });
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        return;
    }

    const rrData = reactionRoles[messageId];
    
    // Check role hierarchy and permissions
    const botMember = await interaction.guild.members.fetch(interaction.client.user.id);
    if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
        const errorEmbed = createEmbed.error({
            title: '❌ Missing Permissions',
            description: 'I don\'t have the **Manage Roles** permission.',
        });
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        return;
    }

    if (role.position >= botMember.roles.highest.position) {
        const errorEmbed = createEmbed.error({
            title: '❌ Role Hierarchy Error',
            description: `I cannot manage ${role} because it is higher than or equal to my highest role.\n\nPlease move my role above ${role} in Server Settings → Roles.`,
        });
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        return;
    }

    if (role.managed) {
        const errorEmbed = createEmbed.error({
            title: '❌ Managed Role',
            description: `${role} is a managed role (bot/integration role) and cannot be assigned manually.`,
        });
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        return;
    }
    
    // Fetch the message
    let message;
    try {
        const channel = await interaction.client.channels.fetch(rrData.channelId);
        message = await channel.messages.fetch(messageId);
    } catch (error) {
        const errorEmbed = createEmbed.error({
            title: '❌ Message Not Found',
            description: 'Could not find the message. It may have been deleted.',
        });
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        return;
    }

    // Add the reaction to the message
    try {
        await message.react(emojiInput);
    } catch (error) {
        const errorEmbed = createEmbed.error({
            title: '❌ Invalid Emoji',
            description: 'Could not add that emoji. Make sure it\'s a valid emoji or custom emoji from this server.',
        });
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        return;
    }

    // Save the role-emoji mapping
    rrData.roles[emojiInput] = role.id;
    await saveReactionRole(messageId, rrData);

    // Update the embed to show the new role (only if an embed exists)
    const currentEmbed = message.embeds?.[0];
    if (currentEmbed) {
        const fields = currentEmbed.fields ? [...currentEmbed.fields] : [];
        
        // Add or update the roles field
        const rolesFieldIndex = fields.findIndex(f => f.name === '📋 Available Roles');
        const rolesList = Object.entries(rrData.roles)
            .map(([emoji, roleId]) => `${emoji} - <@&${roleId}>`)
            .join('\n');
        
        const newField = {
            name: '📋 Available Roles',
            value: rolesList,
            inline: false
        };

        if (rolesFieldIndex >= 0) {
            fields[rolesFieldIndex] = newField;
        } else {
            fields.push(newField);
        }

        const updatedEmbed = EmbedBuilder.from(currentEmbed)
            .setFields(fields);

        await message.edit({ embeds: [updatedEmbed] });
    }

    const successEmbed = createEmbed.success({
        title: '✅ Role Added',
        description: `${emojiInput} → ${role} has been added to the reaction role message.`,
    });
    await interaction.reply({ embeds: [successEmbed], flags: MessageFlags.Ephemeral });
}

/**
 * Remove a reaction role message
 */
async function handleRemove(interaction) {
    const messageId = interaction.options.getString('message_id');

    const reactionRoles = await getReactionRoles();
    if (!reactionRoles[messageId]) {
        const errorEmbed = createEmbed.error({
            title: '❌ Message Not Found',
            description: 'This message ID is not registered as a reaction role message.',
        });
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        return;
    }

    await removeReactionRole(messageId);

    const successEmbed = createEmbed.success({
        title: '✅ Reaction Role Removed',
        description: `Reaction role message \`${messageId}\` has been removed from the database.`,
    });
    await interaction.reply({ embeds: [successEmbed], flags: MessageFlags.Ephemeral });
}

/**
 * List all active reaction role messages
 */
async function handleList(interaction) {
    const reactionRoles = await getReactionRoles();
    const entries = Object.entries(reactionRoles);

    if (entries.length === 0) {
        const embed = createEmbed.info({
            title: '📋 Reaction Roles',
            description: 'No reaction role messages have been created yet.',
        });
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        return;
    }

    const fields = entries.map(([messageId, data]) => {
        const roleCount = Object.keys(data.roles).length;
        return {
            name: data.title,
            value: `**Message ID:** \`${messageId}\`\n**Channel:** <#${data.channelId}>\n**Roles:** ${roleCount}`,
            inline: false
        };
    });

    const embed = createEmbed.info({
        title: '📋 Active Reaction Roles',
        description: `${entries.length} reaction role message(s) configured.`,
        fields: fields
    });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

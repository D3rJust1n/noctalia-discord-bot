const { getReactionRoles } = require('../utils/reactionRoles');

/**
 * Sets up the reaction role handler
 * @param {Client} client - Discord.js client
 */
function setupReactionRoleHandler(client) {
    // Handle reaction add
    client.on('messageReactionAdd', async (reaction, user) => {
        // Ignore bot reactions
        if (user.bot) return;

        // Handle partial reactions
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('Error fetching reaction:', error);
                return;
            }
        }

        await handleReaction(reaction, user, 'add');
    });

    // Handle reaction remove
    client.on('messageReactionRemove', async (reaction, user) => {
        // Ignore bot reactions
        if (user.bot) return;

        // Handle partial reactions
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('Error fetching reaction:', error);
                return;
            }
        }

        await handleReaction(reaction, user, 'remove');
    });

    console.log('Reaction role handler initialized');
}

/**
 * Handle a reaction event
 * @param {MessageReaction} reaction - The reaction
 * @param {User} user - The user who reacted
 * @param {string} action - 'add' or 'remove'
 */
async function handleReaction(reaction, user, action) {
    try {
        const messageId = reaction.message.id;
        const reactionRoles = await getReactionRoles();

        // Check if this message is a reaction role message
        if (!reactionRoles[messageId]) {
            return;
        }

        const rrData = reactionRoles[messageId];
        
        // Get the emoji identifier - normalize custom emoji to ID only
        const normalizedEmoji = reaction.emoji.id 
            ? reaction.emoji.id // Custom emoji: store/lookup by ID only
            : reaction.emoji.name; // Unicode emoji: use name

        // Check if this emoji is mapped to a role
        const roleId = rrData.roles[normalizedEmoji];
        if (!roleId) {
            return;
        }

        // Get the guild member (force fetch to ensure cache is up to date)
        const guild = reaction.message.guild;
        const member = await guild.members.fetch({ user: user.id, force: true });
        
        // Get the role
        const role = await guild.roles.fetch(roleId);
        if (!role) {
            console.error(`Role ${roleId} not found in guild ${guild.id}`);
            return;
        }

        // Check bot permissions
        const botMember = await guild.members.fetch(reaction.client.user.id);
        if (!botMember.permissions.has('ManageRoles')) {
            console.error('Bot lacks ManageRoles permission');
            return;
        }

        // Check role hierarchy
        if (role.position >= botMember.roles.highest.position) {
            console.error(`Cannot assign role ${role.name} (position ${role.position}) - role is higher than or equal to bot's highest role (position ${botMember.roles.highest.position})`);
            // Try to DM the user about the issue
            try {
                await user.send(`⚠️ I couldn't ${action === 'add' ? 'give you' : 'remove'} the **${role.name}** role because it's higher than my highest role. Please contact a server administrator to fix the role hierarchy.`);
            } catch (dmError) {
                // User has DMs disabled, can't notify them
            }
            return;
        }

        // Check if role is managed
        if (role.managed) {
            console.error(`Cannot assign role ${role.name} - role is managed by an integration`);
            return;
        }

        // Add or remove the role
        try {
            if (action === 'add') {
                await member.roles.add(role);
                console.log(`✅ Added role ${role.name} to ${user.tag}`);
            } else if (action === 'remove') {
                await member.roles.remove(role);
                console.log(`✅ Removed role ${role.name} from ${user.tag}`);
            }
        } catch (roleError) {
            console.error(`Failed to ${action} role ${role.name} for ${user.tag}:`, roleError.message);
        }
    } catch (error) {
        console.error('Error handling reaction role:', error);
    }
}

module.exports = { setupReactionRoleHandler };

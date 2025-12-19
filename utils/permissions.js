const permissions = require('../config/permissions');

/**
 * @param {GuildMember} member - The Discord guild member
 * @param {string} commandName - The name of the command
 * @returns {Object} - { allowed: boolean, reason?: string }
 */
function checkPermission(member, commandName) {
    // If no permissions are configured for this command, allow it
    const commandPerms = permissions[commandName];
    if (!commandPerms) {
        return { allowed: true };
    }

    if (commandPerms.allowedUsers && commandPerms.allowedUsers.includes(member.id)) {
        return { allowed: true };
    }

    if (commandPerms.allowedRoles && commandPerms.allowedRoles.length > 0) {
        const userRoles = member.roles.cache;
        
        const hasPermission = commandPerms.allowedRoles.some(roleIdentifier => {
            // Check by role ID
            if (userRoles.has(roleIdentifier)) {
                return true;
            }
            
            // Check by role name (case-sensitive)
            const role = userRoles.find(r => r.name === roleIdentifier);
            return role !== undefined;
        });

        if (hasPermission) {
            return { allowed: true };
        }

        const roleList = commandPerms.allowedRoles
            .map(r => typeof r === 'string' && r.length > 18 ? `<@&${r}>` : `\`${r}\``)
            .join(', ');
        
        return {
            allowed: false,
            reason: `This command requires one of the following roles: ${roleList}`,
        };
    }

    // If allowedRoles is empty or not set, but commandPerms exists, deny by default
    return {
        allowed: false,
        reason: 'You do not have permission to use this command.',
    };
}

/**
 * @param {string} commandName - The name of the command
 * @returns {boolean}
 */
function requiresPermission(commandName) {
    return permissions[commandName] !== undefined;
}

module.exports = {
    checkPermission,
    requiresPermission,
};


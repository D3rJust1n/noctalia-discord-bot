const fs = require('fs').promises;
const path = require('path');

const REACTION_ROLES_FILE = path.join(__dirname, '../data/reactionRoles.json');

/**
 * Ensure the data directory exists
 */
async function ensureDataDirectory() {
    const dataDir = path.dirname(REACTION_ROLES_FILE);
    try {
        await fs.access(dataDir);
    } catch {
        await fs.mkdir(dataDir, { recursive: true });
    }
}

/**
 * Load reaction roles from file
 * @returns {Promise<Object>} Reaction roles data
 */
async function loadReactionRoles() {
    await ensureDataDirectory();
    
    try {
        const data = await fs.readFile(REACTION_ROLES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File doesn't exist, return empty object
            return {};
        }
        if (error instanceof SyntaxError) {
            // JSON is corrupted, log warning and return empty object
            console.warn('Warning: reactionRoles.json is corrupted. Starting fresh.');
            return {};
        }
        throw error;
    }
}

/**
 * Save reaction roles to file
 * @param {Object} data - Reaction roles data
 */
async function saveReactionRolesData(data) {
    await ensureDataDirectory();
    await fs.writeFile(REACTION_ROLES_FILE, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Get all reaction roles
 * @returns {Promise<Object>} All reaction roles
 */
async function getReactionRoles() {
    return await loadReactionRoles();
}

/**
 * Save or update a reaction role
 * @param {string} messageId - Message ID
 * @param {Object} reactionRoleData - Reaction role data
 */
async function saveReactionRole(messageId, reactionRoleData) {
    const data = await loadReactionRoles();
    data[messageId] = reactionRoleData;
    await saveReactionRolesData(data);
}

/**
 * Remove a reaction role
 * @param {string} messageId - Message ID to remove
 */
async function removeReactionRole(messageId) {
    const data = await loadReactionRoles();
    delete data[messageId];
    await saveReactionRolesData(data);
}

/**
 * Get a specific reaction role
 * @param {string} messageId - Message ID
 * @returns {Promise<Object|null>} Reaction role data or null
 */
async function getReactionRole(messageId) {
    const data = await loadReactionRoles();
    return data[messageId] || null;
}

module.exports = {
    getReactionRoles,
    saveReactionRole,
    removeReactionRole,
    getReactionRole,
};

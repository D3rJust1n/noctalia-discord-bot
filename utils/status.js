const { ActivityType } = require('discord.js');
const { getLatestRelease, getLatestCommit } = require('./github');
const resources = require('../config/resources');

/**
 * @param {Client} client - The Discord client instance
 */
async function updateBotStatus(client) {
    try {
        const [release, commit, qsRelease, qsCommit] = await Promise.all([
            getLatestRelease(resources.githubApi.owner, resources.githubApi.repo),
            getLatestCommit(resources.githubApi.owner, resources.githubApi.repo),
            getLatestRelease(resources.githubApiQs.owner, resources.githubApiQs.repo),
            getLatestCommit(resources.githubApiQs.owner, resources.githubApiQs.repo),
        ]);
        
        let statusText = '';
        
        if (release && commit) {
            statusText = `${release.tag} • ${commit.sha}`;
        } else if (release) {
            statusText = release.tag;
        } else if (commit) {
            statusText = `Commit: ${commit.sha}`;
        } else {
            statusText = 'Noctalia Shell';
        }
        
        if (qsRelease && qsCommit) {
            statusText += ` | QS ${qsRelease.tag} • ${qsCommit.sha}`;
        } else if (qsRelease) {
            statusText += ` | QS ${release.tag}`;
        } else if (qsCommit) {
            statusText += ` | QS Commit ${qsCommit.sha}`;
        }
        
        client.user.setActivity(statusText, {
            type: ActivityType.Watching,
        });
        
        console.log(`Bot status updated: ${statusText}`);
    } catch (error) {
        console.error('Error updating bot status:', error);
        client.user.setActivity('Noctalia Shell', {
            type: ActivityType.Watching,
        });
    }
}

module.exports = {
    updateBotStatus,
};


const { checkPermission } = require('../utils/permissions');
const permissions = require('../config/permissions');

const TRIGGER_ROLE = permissions.mentionHandler?.triggerRole || 'Moonwarden';

const DOCS_URL = 'https://docs.noctalia.dev/';

// Casual conversational responses (no docs)
const CASUAL_RESPONSES = [
    `hey! what's up?`,
    `oh hi!`,
    `yeah?`,
    `what's going on?`,
    `hi there!`,
    `hey hey`,
    `oh hey!`,
    `sup?`,
    `hey!`,
    `hi!`,
    `oh hey there!`,
    `what's up?`,
];

// Responses that naturally include docs (when context suggests help is needed)
const DOCS_RESPONSES = [
    `oh! [the docs](${DOCS_URL}) might help with that`,
    `hmm, have you checked [the docs](${DOCS_URL})? they're pretty comprehensive`,
    `[the docs](${DOCS_URL}) usually have the answer to stuff like this`,
    `yeah, [the docs](${DOCS_URL}) cover that pretty well actually`,
    `[the docs](${DOCS_URL}) are worth a look for this`,
    `i think [the docs](${DOCS_URL}) might have what you need`,
    `Hmm, looks like someone skipped reading [the docs](${DOCS_URL})! Don't worry, I've got you covered. The documentation is actually really well organized, I promise.`,
    `Oh! You're looking for [the docs](${DOCS_URL})? They're right here! I know documentation can be overwhelming, but trust me, it's worth the read.`,
    `I see someone might have missed the documentation section. No judgment! [The docs](${DOCS_URL}) are super helpful though, especially if you're just getting started.`,
    `Hey! Did you know [the docs](${DOCS_URL}) have answers to most questions? I know it's tempting to ask first, but honestly, the docs are pretty comprehensive.`,
    `Okay, so I'm going to gently nudge you toward [the docs](${DOCS_URL}). They're actually really good! I've read through them myself and they're quite thorough.`,
    `I sense a lack of [documentation](${DOCS_URL}) knowledge here. That's totally fine! The docs are really well written and cover pretty much everything you'd need.`,
    `As your friendly neighborhood documentation enthusiast, I'm going to suggest checking out [the docs](${DOCS_URL}). They're genuinely helpful, I'm not just saying that!`,
    `Someone's about to learn something cool! [The docs](${DOCS_URL}) have all the info you need, and they're actually pretty easy to navigate once you get the hang of it.`,
];

/**
 * Keywords that suggest the user needs help
 */
const HELP_KEYWORDS = [
    'how', 'why', 'what', 'when', 'where', 'help', 'issue', 'problem', 'error', 
    'broken', 'fix', 'install', 'setup', 'configure', 'config', 'not working',
    'can\'t', 'cannot', 'won\'t', 'doesn\'t', 'fails', '?'
];

/**
 * Check if the message seems to be asking for help
 */
function seemsLikeHelpRequest(content) {
    const lowerContent = content.toLowerCase();
    return HELP_KEYWORDS.some(keyword => lowerContent.includes(keyword));
}

/**
 * Sets up the mention handler for the bot
 */
function setupMentionHandler(client) {
    client.on('messageCreate', async message => {
        // Ignore bot messages
        if (message.author.bot) return;
        
        // Check if the bot is mentioned
        if (!message.mentions.has(client.user)) return;
        
        // Check if message is in a guild
        if (!message.guild) return;
        
        // Get the member who sent the message
        const member = message.member || await message.guild.members.fetch(message.author.id);
        if (!member) return;
        
        // Check if the member has the trigger role (from config)
        const hasTriggerRole = member.roles.cache.some(role => role.name === TRIGGER_ROLE);
        if (!hasTriggerRole) return;
        
        console.log(`[Mention Handler] Triggered by ${message.author.tag} (${message.author.id}) in ${message.guild.name}`);
        
        // Check if there are other users mentioned (besides the bot)
        const mentionedUsers = message.mentions.users.filter(user => user.id !== client.user.id);
        const mentionedUserArray = Array.from(mentionedUsers.values());
        
        // Generate smart context-aware response with learning (pure JavaScript)
        const response = await generateAIResponse(message.content, mentionedUserArray);
        console.log(`[Mention Handler] Generated response`);
        
        // If no response (no validated responses yet), don't send anything
        if (!response) {
            console.log(`[Mention Handler] No response generated - waiting for validated responses`);
            return;
        }
        
        // If there are other users mentioned, address the first one
        // Otherwise just reply to the message
        let sentMessage;
        if (mentionedUsers.size > 0) {
            const targetUser = mentionedUsers.first();
            sentMessage = await message.channel.send(`${targetUser}, ${response}`);
        } else {
            sentMessage = await message.reply(response);
        }
        
        console.log(`[Mention Handler] Response sent successfully`);
        
        // Set up reaction learning - learn from positive/negative reactions
        const positiveReactions = ['👍', '❤️', '✅', '😊', '🎉', '💯', 'thumbsup', '+1'];
        const negativeReactions = ['👎', '😞', '❌', '😕', 'thumbsdown', '-1'];
        
        console.log(`[Mention Handler] Setting up reaction collector for message: "${response.substring(0, 50)}"`);
        
        const reactionCollector = sentMessage.createReactionCollector({
            filter: (reaction, user) => {
                if (user.bot) return false;
                
                // Check both emoji name and id for custom emojis
                const emojiName = reaction.emoji.name;
                const emojiId = reaction.emoji.id;
                
                // Log all reactions for debugging
                console.log(`[Mention Handler] Reaction received: ${emojiName} (id: ${emojiId}) from ${user.tag}`);
                
                const isPositive = positiveReactions.includes(emojiName) || emojiName === '👍';
                const isNegative = negativeReactions.includes(emojiName) || emojiName === '👎';
                
                return isPositive || isNegative;
            },
            time: 60000, // Learn from reactions within 1 minute
        });
        
        reactionCollector.on('collect', async (reaction, user) => {
            const emojiName = reaction.emoji.name;
            const isPositive = positiveReactions.includes(emojiName) || emojiName === '👍';
            const isNegative = negativeReactions.includes(emojiName) || emojiName === '👎';
            
            if (isNegative) {
                try {
                    const member = await message.guild.members.fetch(user.id);
                    if (!await canDownvote(member)) {
                        const roleList = DOWNVOTE_ROLES.join(', ');
                        console.log(`[Mention Handler] Ignoring downvote from ${user.tag} - requires one of: ${roleList}`);
                        return;
                    }
                } catch (error) {
                    console.error(`[Mention Handler] Error checking role for ${user.tag}:`, error);
                    return;
                }
            }
            
            console.log(`[Mention Handler] Processing ${isPositive ? 'positive' : 'negative'} reaction: ${emojiName} from ${user.tag}`);
            await learnFromFeedback(message.content, response, isPositive);
            console.log(`[Mention Handler] Learned from ${isPositive ? 'positive' : 'negative'} reaction: ${emojiName}`);
        });
        
        // Also listen to raw reaction events as a fallback (in case collector doesn't work)
        const reactionHandler = async (reaction, user) => {
            try {
                // Fetch the message if it's a partial
                if (reaction.message.partial) {
                    await reaction.message.fetch();
                }
                
                if (user.bot) return;
                if (reaction.message.id !== sentMessage.id) return;
                
                const emojiName = reaction.emoji.name;
                const isPositive = positiveReactions.includes(emojiName) || emojiName === '👍';
                const isNegative = negativeReactions.includes(emojiName) || emojiName === '👎';
                
                if (isPositive || isNegative) {
                    if (isNegative) {
                        try {
                            const member = await message.guild.members.fetch(user.id);
                            if (!await canDownvote(member)) {
                                const roleList = DOWNVOTE_ROLES.join(', ');
                                console.log(`[Mention Handler] Fallback: Ignoring downvote from ${user.tag} - requires one of: ${roleList}`);
                                return;
                            }
                        } catch (error) {
                                console.error(`[Mention Handler] Error checking role for ${user.tag}:`, error);
                                return;
                            }
                        }
                    
                    console.log(`[Mention Handler] Fallback: Processing ${isPositive ? 'positive' : 'negative'} reaction: ${emojiName} from ${user.tag}`);
                    await learnFromFeedback(message.content, response, isPositive);
                }
            } catch (error) {
                console.error('[Mention Handler] Error in reaction handler:', error);
            }
        };
        
        client.on('messageReactionAdd', reactionHandler);
        
        reactionCollector.on('end', async (collected, reason) => {
            console.log(`[Mention Handler] Reaction collector ended: ${reason}, collected ${collected.size} reactions`);
            client.off('messageReactionAdd', reactionHandler);
        });
        
        // Learn from conversation flow - if user replies to Talia's message, that's positive
        const conversationCollector = message.channel.createMessageCollector({
            filter: (msg) => {
                // Only count if someone (not a bot) actually replies to Talia's message
                return !msg.author.bot && 
                       msg.author.id !== client.user.id &&
                       msg.createdTimestamp > sentMessage.createdTimestamp &&
                       msg.reference && 
                       msg.reference.messageId === sentMessage.id; // Must be a reply to Talia's message
            },
            time: 300000, // 5 minutes
            max: 1, // Just need to know if someone responded
        });
        
        conversationCollector.on('collect', async (followUp) => {
            // User replied to Talia's message - Talia's response was good! Boost it
            await learnFromFeedback(message.content, response, true);
            await learnFromConversationFlow(response, followUp.content, message.content);
            console.log(`[Mention Handler] Learned from conversation flow - user replied to Talia's message`);
        });
        
        // Also learn when conversation stops - if no one responds, slightly penalize
        conversationCollector.on('end', async (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                // No one responded - slightly penalize this response for this context
                const { patternKey } = require('../utils/learning').extractPattern(message.content);
                const data = await require('../utils/learning').loadLearningData();
                if (data.patterns[patternKey] && data.patterns[patternKey][response]) {
                    data.patterns[patternKey][response] = Math.max(0.3, 
                        data.patterns[patternKey][response] - 0.05);
                    await require('../utils/learning').saveLearningData(data);
                    console.log(`[Mention Handler] Slightly penalized response that didn't continue conversation`);
                }
            }
        });
    });
}

module.exports = {
    setupMentionHandler,
};

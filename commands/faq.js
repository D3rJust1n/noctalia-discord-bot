const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../utils/embeds');
const faqs = require('../config/faq');
const resources = require('../config/resources');

/**
 * Builds the FAQ command with a choice option
 */
function buildFAQCommand() {
    const command = new SlashCommandBuilder()
        .setName('faq')
        .setDescription('Frequently asked questions about Noctalia')
        .addStringOption(option =>
            option
                .setName('topic')
                .setDescription('Select a FAQ topic to view')
                .setRequired(false)
                .addChoices(...faqs.map(faq => ({
                    name: faq.question.length > 100 ? faq.question.substring(0, 97) + '...' : faq.question,
                    value: faq.id,
                })))
        );

    return command;
}

/**
 * Groups FAQs by category for better organization
 */
function groupFAQsByCategory() {
    const grouped = {};
    faqs.forEach(faq => {
        const category = faq.category || 'general';
        if (!grouped[category]) {
            grouped[category] = [];
        }
        grouped[category].push(faq);
    });
    return grouped;
}

/**
 * Formats category name for display
 */
function formatCategoryName(category) {
    return category
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

module.exports = {
    data: buildFAQCommand(),
    async execute(interaction) {
        const topicId = interaction.options.getString('topic');

        // If no topic is selected, show the list
        if (!topicId) {
            const grouped = groupFAQsByCategory();
            const fields = [];

            // Create fields for each category
            Object.keys(grouped).sort().forEach(category => {
                const categoryFAQs = grouped[category];
                const faqList = categoryFAQs
                    .map(faq => `• ${faq.question}`)
                    .join('\n');
                
                // Discord embed field value limit is 1024 characters
                if (faqList.length > 1024) {
                    // Split into multiple fields if needed
                    const chunks = [];
                    let currentChunk = '';
                    categoryFAQs.forEach(faq => {
                        const line = `• ${faq.question}\n`;
                        if (currentChunk.length + line.length > 1024) {
                            chunks.push(currentChunk.trim());
                            currentChunk = line;
                        } else {
                            currentChunk += line;
                        }
                    });
                    if (currentChunk) chunks.push(currentChunk.trim());
                    
                    chunks.forEach((chunk, index) => {
                        fields.push({
                            name: index === 0 ? formatCategoryName(category) : '\u200b',
                            value: chunk,
                            inline: false,
                        });
                    });
                } else {
                    fields.push({
                        name: formatCategoryName(category),
                        value: faqList,
                        inline: false,
                    });
                }
            });

            const embed = createEmbed.info({
                title: '❓ Frequently Asked Questions',
                description: `Browse all available FAQ topics. Select a topic from the dropdown to view the answer.\n\n**[View Full FAQ on Docs](${resources.docs.faq})**`,
                fields: fields,
                footer: `Can't find what you're looking for? Check the full documentation or ask in #issues!`,
            });

            await interaction.reply({ embeds: [embed] });
            return;
        }

        // Handle selected FAQ topic
        const faq = faqs.find(f => f.id === topicId);
        
        if (!faq) {
            const errorEmbed = createEmbed.error({
                title: '❌ FAQ Not Found',
                description: `The FAQ topic was not found. Use \`/faq\` without a topic to see all available topics.`,
            });
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        const embed = createInfoEmbed({
            title: `❓ ${faq.question}`,
            description: faq.answer,
            footer: `Category: ${formatCategoryName(faq.category || 'general')} • Use /faq to see all FAQs`,
        });

        await interaction.reply({ embeds: [embed] });
    },
};


const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../utils/embeds');
const { getDocs } = require('../utils/docs');
const resources = require('../config/resources');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('docs')
        .setDescription('Get links to Noctalia documentation and resources'),
    async execute(interaction) {
        // Fetch docs from API only (no fallback)
        let docs;
        try {
            docs = await getDocs();
        } catch (error) {
            console.error('Failed to fetch docs:', error);
            const errorEmbed = createEmbed.error({
                title: '❌ Documentation API Unavailable',
                description: `Unable to fetch documentation from the API. Please try again later.\n\n**[View Docs](${resources.docs.main})**`,
            });
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }
        
        const embed = createEmbed.info({
            title: '📚 Noctalia Documentation',
            description: `**[📖 View Full Documentation](${docs.main})**\n\nQuick access to guides and resources for Noctalia.`,
            fields: [
                {
                    name: '📋 Documentation Sections',
                    value: `• [🚀 Getting Started](${docs.gettingStarted})\n• [⚙️ Configuration](${docs.configuration})\n• [🎨 Theming](${docs.theming})\n• [💻 Development](${docs.development})\n• [❓ FAQ](${docs.faq})`,
                    inline: false,
                },
                {
                    name: '🔗 Community & Resources',
                    value: `[GitHub](${resources.github}) • [Website](${resources.website})`,
                    inline: false,
                },
            ],
            footer: `Need help? Check the FAQ first, if you can't solve the problem, create a thread in #issues!`,
        });

        await interaction.reply({ embeds: [embed] });
    },
};


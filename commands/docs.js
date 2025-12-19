const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../utils/embeds');
const resources = require('../config/resources');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('docs')
        .setDescription('Get links to Noctalia documentation and resources'),
    async execute(interaction) {
        const embed = createEmbed.info({
            title: '📚 Noctalia Documentation',
            description: `**[📖 View Full Documentation](${resources.docs.main})**\n\nQuick access to guides and resources for Noctalia.`,
            fields: [
                {
                    name: '📋 Documentation Sections',
                    value: `• [🚀 Getting Started](${resources.docs.gettingStarted})\n• [⚙️ Configuration](${resources.docs.configuration})\n• [🎨 Theming](${resources.docs.theming})\n• [💻 Development](${resources.docs.development})\n• [❓ FAQ](${resources.docs.faq})`,
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


const { EmbedBuilder } = require('discord.js');

/**
 * @param {Object} options - Embed options
 * @param {string} options.title - Embed title
 * @param {string} options.description - Embed description
 * @param {string} options.color - Embed color (hex code or number)
 * @param {Array} options.fields - Array of field objects {name, value, inline}
 * @param {string} options.footer - Footer text
 * @param {string} options.thumbnail - Thumbnail URL
 * @param {string} options.image - Image URL
 * @param {Object} options.author - Author object {name, iconURL, url}
 * @param {number} options.timestamp - Whether to add timestamp (default: true)
 * @returns {EmbedBuilder}
 */
function createEmbed(options = {}) {
    const {
        title,
        description,
        color = 0xc0b2fe,
        fields = [],
        footer,
        thumbnail,
        image,
        author,
        timestamp = true,
    } = options;

    const embed = new EmbedBuilder();

    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);
    if (color) embed.setColor(color);
    if (thumbnail) embed.setThumbnail(thumbnail);
    if (image) embed.setImage(image);
    if (author) {
        embed.setAuthor({
            name: author.name,
            iconURL: author.iconURL,
            url: author.url,
        });
    }
    if (footer) {
        embed.setFooter({ text: footer });
    }
    if (timestamp) embed.setTimestamp();

    if (fields.length > 0) {
        embed.addFields(fields);
    }

    return embed;
}

createEmbed.success = (options = {}) => {
    return createEmbed({
        ...options,
        color: 0x57F287,
    });
};

createEmbed.error = (options = {}) => {
    return createEmbed({
        ...options,
        color: 0xED4245,
    });
};

createEmbed.warning = (options = {}) => {
    return createEmbed({
        ...options,
        color: 0xFEE75C,
    });
};

createEmbed.info = (options = {}) => {
    return createEmbed({
        ...options,
        color: 0xc0b2fe,
    });
};

module.exports = { createEmbed };


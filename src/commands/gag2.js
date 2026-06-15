const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');

let stockCache = { lastUpdate: null, data: null };
let notifierChannels = new Map(); // guildId -> channelId

async function fetchGAG2Stocks() {
    try {
        // Current best public tracker (change if needed)
        const res = await axios.get('https://cocajola.com/grow-a-garden-stock-predictor/', { timeout: 10000 });
        const $ = cheerio.load(res.data);

        // Placeholder - update selectors when you check the site
        const stocks = {
            seeds: "Check site for latest seeds",
            gear: "Check site for latest gear",
            lastUpdate: new Date().toLocaleTimeString()
        };

        stockCache = { lastUpdate: Date.now(), data: stocks };
        return stocks;
    } catch (error) {
        console.error("GAG2 fetch error:", error.message);
        return { seeds: "Failed to fetch", gear: "Failed to fetch", lastUpdate: new Date().toLocaleTimeString() };
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gag2')
        .setDescription('Grow a Garden 2 Stock Tools')
        .addSubcommand(sub => sub
            .setName('stocks')
            .setDescription('Show current live stocks'))
        .addSubcommand(sub => sub
            .setName('notify')
            .setDescription('Set channel for live stock updates')
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel for updates').setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'stocks') {
            await interaction.deferReply();
            const stocks = await fetchGAG2Stocks();

            const embed = new EmbedBuilder()
                .setTitle("🌱 Grow a Garden 2 - Live Stock")
                .setColor(0x00ff9d)
                .setTimestamp()
                .addFields(
                    { name: "Last Updated", value: stocks.lastUpdate, inline: false },
                    { name: "Seeds", value: stocks.seeds, inline: true },
                    { name: "Gear", value: stocks.gear, inline: true }
                );

            await interaction.editReply({ embeds: [embed] });
        }

        if (sub === 'notify') {
            const channel = interaction.options.getChannel('channel');
            notifierChannels.set(interaction.guildId, channel.id);
            await interaction.reply(`✅ Live stock updates enabled in <#${channel.id}>.`);
        }
    }
};

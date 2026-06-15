import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import axios from "axios";
import cron from "node-cron";

export let notifierChannels = new Map(); // Shared with ready.js

export async function fetchGAG2Stocks() {
    try {
        const res = await axios.get('https://growagarden.gg/', { timeout: 10000 });
        // TODO: Improve scraper later
        return {
            seeds: "Use /gag2 stocks for live data",
            gear: "Shop data loading...",
            lastUpdate: new Date().toLocaleTimeString()
        };
    } catch (error) {
        console.error("GAG2 fetch error:", error.message);
        return {
            seeds: "Failed to fetch",
            gear: "Failed to fetch",
            lastUpdate: new Date().toLocaleTimeString()
        };
    }
}

export default {
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

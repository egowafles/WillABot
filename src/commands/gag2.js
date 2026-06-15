import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import axios from "axios";

export let notifierChannels = new Map();

export async function fetchGAG2Stocks() {
    try {
        // Using a more reliable tracker (Vulcan Values is popular)
        const res = await axios.get('https://vulcanvalues.com/grow-a-garden/stock', { 
            timeout: 15000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        // For now, return basic info (we can improve scraping later)
        return {
            status: "✅ Live",
            seeds: "Check https://vulcanvalues.com/grow-a-garden/stock for full list",
            gear: "Gear shop updates every 5 min",
            lastUpdate: new Date().toLocaleTimeString(),
            link: "https://vulcanvalues.com/grow-a-garden/stock"
        };
    } catch (error) {
        console.error("GAG2 fetch error:", error.message);
        return {
            status: "❌ Error",
            seeds: "Could not fetch live data",
            gear: "Try again soon",
            lastUpdate: new Date().toLocaleTimeString(),
            link: "https://vulcanvalues.com/grow-a-garden/stock"
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
                .setDescription(`**Status:** ${stocks.status}`)
                .setTimestamp()
                .addFields(
                    { name: "Last Updated", value: stocks.lastUpdate, inline: false },
                    { name: "Seeds", value: stocks.seeds, inline: true },
                    { name: "Gear", value: stocks.gear, inline: true },
                    { name: "Best Tracker", value: `[View Full Live Stock](${stocks.link})`, inline: false }
                );

            await interaction.editReply({ embeds: [embed] });
        }

        if (sub === 'notify') {
            const channel = interaction.options.getChannel('channel');
            notifierChannels.set(interaction.guildId, channel.id);
            await interaction.reply(`✅ Live stock updates enabled in <#${channel.id}>. Updates every 5 minutes.`);
        }
    }
};

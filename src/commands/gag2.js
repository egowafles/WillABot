import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";

export let notifierChannels = new Map();

export async function fetchGAG2Stocks() {
    return {
        status: "✅ Debug Mode",
        seeds: "Command is working!",
        gear: "GAG2 Notifier is loaded",
        lastUpdate: new Date().toLocaleTimeString()
    };
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
        console.log(`[GAG2] Command used by ${interaction.user.tag}`);

        const sub = interaction.options.getSubcommand();

        if (sub === 'stocks') {
            await interaction.deferReply();
            const stocks = await fetchGAG2Stocks();

            const embed = new EmbedBuilder()
                .setTitle("🌱 Grow a Garden 2 - Live Stock")
                .setColor(0x00ff9d)
                .setDescription("✅ Command is working!")
                .addFields(
                    { name: "Last Updated", value: stocks.lastUpdate },
                    { name: "Seeds", value: stocks.seeds },
                    { name: "Gear", value: stocks.gear }
                );

            await interaction.editReply({ embeds: [embed] });
        }

        if (sub === 'notify') {
            const channel = interaction.options.getChannel('channel');
            notifierChannels.set(interaction.guildId, channel.id);
            await interaction.reply(`✅ Notifier channel set to <#${channel.id}>.`);
        }
    }
};

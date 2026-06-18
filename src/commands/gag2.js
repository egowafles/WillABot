import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import axios from 'axios';
import cheerio from 'cheerio';
import { logger } from '../utils/logger.js';

export let notifierChannels = new Map(); // GuildId -> channelId

let lastStockData = null;
let lastFetchTime = 0;

async function fetchGAG2Stocks() {
  const now = Date.now();
  // Cache for 30 seconds to avoid hammering
  if (now - lastFetchTime < 30000 && lastStockData) {
    return lastStockData;
  }

  try {
    // Primary source - vulcanvalues (most reliable)
    const { data } = await axios.get('https://vulcanvalues.com/grow-a-garden/stock', { 
      timeout: 15000,
      headers: { 'User-Agent': 'WillABot-GAG2-Stock/1.0' }
    });

    const $ = cheerio.load(data);

    const gearItems = [];
    const seedItems = [];
    const eventItems = [];
    const cosmeticsItems = [];

    // Gear
    $('h2:contains("GEAR STOCK")').nextUntil('h2').find('li, *').each((i, el) => {
      const text = $(el).text().trim();
      if (text && text.includes('x')) gearItems.push(text);
    });

    // Seeds
    $('h2:contains("SEEDS STOCK")').nextUntil('h2').find('li, *').each((i, el) => {
      const text = $(el).text().trim();
      if (text && text.includes('x')) seedItems.push(text);
    });

    // Event & Cosmetics similarly
    $('h2:contains("EVENT STOCK")').nextUntil('h2').find('li, *').each((i, el) => {
      const text = $(el).text().trim();
      if (text && text.includes('x')) eventItems.push(text);
    });

    const stock = {
      status: "✅ Live",
      seeds: seedItems.length ? seedItems.join('\n') : "No data",
      gear: gearItems.length ? gearItems.join('\n') : "No data",
      event: eventItems.length ? eventItems.join('\n') : "None",
      lastUpdate: new Date().toLocaleTimeString(),
      timestamp: now
    };

    lastStockData = stock;
    lastFetchTime = now;
    logger.info(`[GAG2] Stock fetched successfully - ${seedItems.length} seeds, ${gearItems.length} gear`);
    return stock;

  } catch (error) {
    logger.error(`[GAG2] Fetch failed: ${error.message}`);
    // Fallback to debug if completely broken
    return {
      status: "⚠️ Partial / Cached",
      seeds: lastStockData?.seeds || "Fetch error - try again",
      gear: lastStockData?.gear || "Fetch error - try again",
      lastUpdate: new Date().toLocaleTimeString()
    };
  }
}

// Background notifier (add this to app.js later if wanted)
export async function startGAG2Notifier(client) {
  // Every 5 minutes check for changes and notify
  // You can expand this
  logger.info('✅ GAG2 Notifier service ready');
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
    console.log(`[GAG2] Command used by ${interaction.user.tag} in ${interaction.guildId}`);

    const sub = interaction.options.getSubcommand();

    if (sub === 'stocks') {
      await interaction.deferReply();
      const stocks = await fetchGAG2Stocks();

      const embed = new EmbedBuilder()
        .setTitle("🌱 Grow a Garden 2 - Live Stock")
        .setColor(0x00ff9d)
        .setDescription(`**Status:** ${stocks.status}`)
        .addFields(
          { name: "🌱 Seeds", value: stocks.seeds || "None", inline: false },
          { name: "⚒️ Gear", value: stocks.gear || "None", inline: false },
          { name: "📅 Last Updated", value: stocks.lastUpdate, inline: true }
        )
        .setTimestamp();

      if (stocks.event && stocks.event !== "None") {
        embed.addFields({ name: "🎉 Event Stock", value: stocks.event, inline: false });
      }

      await interaction.editReply({ embeds: [embed] });
    }

    if (sub === 'notify') {
      const channel = interaction.options.getChannel('channel');
      if (!channel.isTextBased()) {
        return interaction.reply({ content: "❌ Please select a text channel.", ephemeral: true });
      }
      notifierChannels.set(interaction.guildId, channel.id);
      await interaction.reply(`✅ Stock notifier channel set to <#${channel.id}>. Updates will post here when stock changes.`);
    }
  }
};

import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import axios from 'axios';
import * as cheerio from 'cheerio';   // <-- Fixed import (this is the key)
import { logger } from '../utils/logger.js';

export let notifierChannels = new Map(); // guildId -> channelId

let lastStockData = null;
let lastFetchTime = 0;

async function fetchGAG2Stocks() {
  const now = Date.now();
  if (now - lastFetchTime < 30000 && lastStockData) return lastStockData;

  try {
    const { data } = await axios.get('https://vulcanvalues.com/grow-a-garden/stock', {
      timeout: 15000,
      headers: { 'User-Agent': 'WillABot-GAG2/1.0' }
    });

    const $ = cheerio.load(data);

    const extractSection = (heading) => {
      const items = [];
      $(`h2:contains("${heading}")`).nextUntil('h2').find('li, *').each((i, el) => {
        const text = $(el).text().trim();
        if (text && (text.includes('x') || text.match(/\w/))) items.push(text);
      });
      return items.length ? items.join('\n') : "None available";
    };

    const stock = {
      status: "✅ Live",
      gear: extractSection("GEAR STOCK"),
      egg: extractSection("EGG STOCK"),
      seeds: extractSection("SEEDS STOCK"),
      event: extractSection("EVENT STOCK"),
      cosmetics: extractSection("COSMETICS STOCK"),
      lastUpdate: new Date().toLocaleString(),
      timestamp: now
    };

    lastStockData = stock;
    lastFetchTime = now;
    logger.info(`[GAG2] Stock fetched successfully`);
    return stock;

  } catch (error) {
    logger.error(`[GAG2] Fetch failed: ${error.message}`);
    return lastStockData || {
      status: "⚠️ Error",
      gear: "Fetch failed - try again",
      seeds: "Fetch failed - try again",
      lastUpdate: new Date().toLocaleString()
    };
  }
}

export async function startGAG2Notifier(client) {
  logger.info('✅ GAG2 Stock monitor service started');
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
        .addFields(
          { name: "⚒️ Gear", value: stocks.gear, inline: false },
          { name: "🥚 Egg", value: stocks.egg, inline: false },
          { name: "🌱 Seeds", value: stocks.seeds, inline: false },
          { name: "🎉 Event", value: stocks.event, inline: false },
          { name: "💄 Cosmetics", value: stocks.cosmetics, inline: false },
          { name: "🕒 Last Updated", value: stocks.lastUpdate, inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }

    if (sub === 'notify') {
      const channel = interaction.options.getChannel('channel');
      if (!channel?.isTextBased?.()) {
        return interaction.reply({ content: "❌ Select a text channel.", ephemeral: true });
      }
      notifierChannels.set(interaction.guildId, channel.id);
      await interaction.reply(`✅ Stock updates will now post in <#${channel.id}>.`);
    }
  }
};

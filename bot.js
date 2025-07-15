const TelegramBot = require("node-telegram-bot-api");
const express = require("express");

// === CONFIGURATION ===
const BOT_TOKEN = "7536099881:AAEy7vuba93VnAFmxbBIUrS2oJVx8ueNR9c";
const YOUR_NAME = "Kaustav Ray";

// === SETUP BOT ===
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const app = express();

// === SERVER TO KEEP RENDER ALIVE ===
app.get("/", (req, res) => res.send("🤖 Bot is alive and running!"));
app.listen(process.env.PORT || 3000, () => {
  console.log("✅ Express web server started.");
});

// === TRACK CHANNELS WHERE BOT IS ADMIN ===
let adminChannels = new Set();

// === FORMAT CAPTION ===
function formatCaption(text) {
  return (text || "") + "\n\n" + YOUR_NAME;
}

// === DETECT WHEN BOT IS MADE ADMIN ===
bot.on("my_chat_member", (msg) => {
  const chat = msg.chat;
  const status = msg.new_chat_member.status;

  if (chat.type === "channel") {
    if (status === "administrator" || status === "creator") {
      adminChannels.add(chat.id);
      console.log(`✅ Added admin channel: ${chat.title || chat.id}`);
    } else {
      adminChannels.delete(chat.id);
      console.log(`❌ Removed channel: ${chat.title || chat.id}`);
    }
  }
});

// === HANDLE INCOMING USER MESSAGES ===
bot.on("message", async (msg) => {
  if (!msg || msg.chat.type !== "private") return;

  const caption = formatCaption(msg.caption || msg.text || "");
  console.log(`📩 Message received from ${msg.from.username || msg.from.id}`);

  if (adminChannels.size === 0) {
    bot.sendMessage(msg.chat.id, "⚠️ I'm not admin in any channel yet.");
    return;
  }

  for (let channelId of adminChannels) {
    try {
      if (msg.photo) {
        await bot.sendPhoto(channelId, msg.photo.at(-1).file_id, { caption });
      } else if (msg.video) {
        await bot.sendVideo(channelId, msg.video.file_id, { caption });
      } else if (msg.document) {
        await bot.sendDocument(channelId, msg.document.file_id, { caption });
      } else if (msg.audio) {
        await bot.sendAudio(channelId, msg.audio.file_id, { caption });
      } else if (msg.voice) {
        await bot.sendVoice(channelId, msg.voice.file_id, { caption });
      } else if (msg.text) {
        await bot.sendMessage(channelId, caption);
      } else {
        await bot.sendMessage(channelId, `⚠️ Unsupported content.\n\n${caption}`);
      }

      console.log(`📤 Forwarded to ${channelId}`);
    } catch (err) {
      console.error(`❌ Failed to send to ${channelId}:`, err.message);
    }
  }

  await bot.sendMessage(msg.chat.id, "✅ Message forwarded successfully.");
});

// === AUTO-RESTART EVERY 1 HOUR ===
setTimeout(() => {
  console.log("♻️ Auto restarting bot after 1 hour...");
  process.exit(0); // Render will restart the service
}, 3600000); // 1 hour in milliseconds

// Log bot startup time
console.log("🚀 Bot started at", new Date().toLocaleString());

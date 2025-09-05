const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const { MongoClient } = require("mongodb");

// === CONFIGURATION ===
const BOT_TOKEN = "8044425978:AAEPXnokl80QPt_9dojzdv1ImTWmSvofHiE";
const YOUR_NAME = "Kaustav Ray                                                      Join here: @filestore4u     @freemovie5u ";

const MONGODB_URI = "mongodb+srv://refay35820:fNS6JM3DC2PmsbgV@cluster0.n6j6fas.mongodb.net/telegramBot?retryWrites=true&w=majority&appName=Cluster0";
const DB_NAME = "telegramBot";
const COLLECTION_NAME = "channels";

// === Express Setup ===
const app = express();
app.get("/", (req, res) => res.send("🤖 Bot is running!"));
app.listen(process.env.PORT || 3000, () => {
  console.log("✅ Express server running...");
});

let adminChannels = new Set();
let db, channelsCollection;

async function initMongo() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db(DB_NAME);
  channelsCollection = db.collection(COLLECTION_NAME);

  const saved = await channelsCollection.find({}).toArray();
  saved.forEach(ch => adminChannels.add(ch.id));
  console.log(`📂 Loaded ${adminChannels.size} channels from MongoDB`);
}

async function saveChannelToMongo(id, title) {
  const exists = await channelsCollection.findOne({ id });
  if (!exists) {
    await channelsCollection.insertOne({ id, title });
    adminChannels.add(id);
    console.log(`💾 Saved new channel: ${title} (${id})`);
  }
}

function formatCaption(text) {
  return (text || "") + "\n\n" + YOUR_NAME;
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

bot.on("my_chat_member", async (msg) => {
  const chat = msg.chat;
  const status = msg.new_chat_member.status;

  if (chat.type === "channel" && (status === "administrator" || status === "creator")) {
    await saveChannelToMongo(chat.id, chat.title || "Untitled");
    console.log(`✅ Bot added as admin in: ${chat.title || chat.id}`);
  }
});

bot.on("message", async (msg) => {
  if (!msg || msg.chat.type !== "private") return;

  const caption = formatCaption(msg.caption || msg.text || "");
  console.log(`📩 Received message from ${msg.from.username || msg.from.id}`);

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

  bot.sendMessage(msg.chat.id, "✅ Forwarded to all admin channels.");
});

// Auto restart every 1 hour to keep Render happy
setTimeout(() => {
  console.log("♻️ Auto restarting bot after 1 hour...");
  process.exit(0);
}, 3600000);

initMongo()
  .then(() => {
    console.log("🚀 Bot started at", new Date().toLocaleString());
  })
  .catch(err => {
    console.error("❌ MongoDB init failed:", err.message);
    process.exit(1);
  });

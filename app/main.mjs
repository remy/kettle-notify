import 'renvy';
import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import * as mqtt from 'mqtt'; // import everything inside the mqtt module and give it the namespace "mqtt"

const channelId = process.env.BOT_CHANNEL_ID;
const botTopic = 'state/bot';
const devices = new Map();

const offlineNotifications = new Map();

// every minute check if the offlineNotifications has any entries
// if it does, then check if the value of the entry is older than 5 minutes
// if it is, then send a message to the channel
setInterval(() => {
  const now = new Date();
  offlineNotifications.forEach(([name, date]) => {
    const diff = now - date;
    if (diff > 300000) {
      bot.telegram.sendMessage(channelId, `🛑 ${name} is offline 🛑`);
      // and remove the entry
      offlineNotifications.delete(name);
    }
  });
}, 60000);

let client = mqtt.connect(`mqtt://${process.env.MQTT_HOST}`, {
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASS,
  will: {
    retain: true,
    topic: botTopic,
    payload: JSON.stringify('DISCONNECTED'),
  },
}); // create a client

const bot = new Telegraf(process.env.BOT_TOKEN);

client.on('connect', async () => {
  console.log('[mqtt] connected');

  client.publish(botTopic, JSON.stringify('CONNECTED'), {
    retain: true,
  });

  ['state/+/kettle', 'tasmota/discovery/#', 'tele/+/LWT'].forEach((topic) => {
    client.subscribe(topic, (err) => {
      if (err) {
        console.log(`[mqtt] failed to connect to ${topic}`, err);
        bot.telegram.sendMessage(channelId, '🛑 [mqtt] failed to subscribe');
      } else {
        console.log(`[mqtt] connected to ${topic}`);
      }
    });
  });

  bot.telegram.sendMessage(channelId, 'Bot has connected to mqtt');
});

client.on('message', (topic, message) => {
  if (topic.startsWith('tele/') && topic.endsWith('/LWT')) {
    const data = message.toString();
    const [, device] = topic.split('/');
    const name = devices.get(device);

    if (data === 'Online') {
      // check if the name is in the `offlineNotifications` array
      // if it is, then remove it and return.
      // if it's not, then send the online message

      if (offlineNotifications.has(name)) {
        offlineNotifications.delete(name);
        return;
      }
      bot.telegram.sendMessage(channelId, `${name} is online`);
      return;
    }

    offlineNotifications.set(name, new Date());
  }

  if (topic.startsWith('tasmota/discovery/') && topic.endsWith('/config')) {
    // message is Buffer
    const data = JSON.parse(message.toString());
    console.log(`[mqtt] discovered device: ${data.t} / ${data.fn[0]}`);
    // collect for mapping
    devices.set(data.t, data.fn[0]);

    // we don't need the discovery message, but we do need to know if it's online or not (above)
    // bot.telegram.sendMessage(channelId, `Discovered "${data.fn[0]}" device`);
  }

  if (topic.startsWith('state/')) {
    // this is the kettle or an error
    const [, device, mode] = topic.split('/');
    const name = devices.get(device);

    if (!name) {
      console.log(`unknown topic delivery`, { topic });
      client.publish(
        botTopic + '/log',
        JSON.stringify({
          error: 'unknown topic',
          topic,
          device,
          message: message.toString(),
        })
      );
    }

    const value = parseInt(message.toString(), 10);
    console.log(new Date().toJSON(), {
      topic,
      message: message.toString(),
      device,
      mode,
      value,
    });
    if (value === 1) {
      bot.telegram.sendMessage(channelId, `${name} is boiling the kettle`);
    }
    if (value === 2) {
      // means the timer has expired and we expected them to have boiled
      bot.telegram.sendMessage(channelId, `⚠️ ${name} hasn't checked in`);
    }
  }
});

bot.command('quit', async (ctx) => {
  // Explicit usage
  await ctx.telegram.leaveChat(ctx.message.chat.id);

  // Using context shortcut
  await ctx.leaveChat();
});

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

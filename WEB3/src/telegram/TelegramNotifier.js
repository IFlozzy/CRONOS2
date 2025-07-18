import TelegramBot from 'node-telegram-bot-api';
import { splitMessage } from '../utils/messageSplitter.js';

export default class TelegramNotifier {
  constructor(telegramToken, chatId, logChatId) {
    this.bot = new TelegramBot(telegramToken, { polling: false });
    this.chatId = chatId;
    this.logChatId = logChatId;
  }

  async sendMainMessage(message) {
    try {
      console.log("Відправляємо повідомлення в основний чат Telegram:\n", message);
      await this.bot.sendMessage(this.chatId, message);
      console.log("Повідомлення відправлено!");
    } catch (err) {
      console.error("Помилка при відправці повідомлення в основний чат Telegram:", err);
    }
  }

  async sendLog(message) {
    try {
      console.log("Відправляємо лог в Telegram:\n", message);
      const messageChunks = splitMessage(message, 4000);
      for (const chunk of messageChunks) {
        await this.bot.sendMessage(this.logChatId, chunk);
      }
      console.log("Лог відправлено в Telegram!");
    } catch (err) {
      console.error("Помилка при відправці логів в Telegram:", err);
    }
  }
}

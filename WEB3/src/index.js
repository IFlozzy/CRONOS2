import TradeBot from './trade/TradeBot.js';
import coinsConfig from './config/coinsConfig.js';

const tradeBot = new TradeBot(coinsConfig);
tradeBot.run().catch((err) => {
  console.error("Помилка в TradeBot:", err);
});

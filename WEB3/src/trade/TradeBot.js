import TelegramNotifier from "../telegram/TelegramNotifier.js";
import CryptoComAPI from "../crypto/CryptoComAPI.js";
import SwapService from "../swap/SwapService.js";
import { SupportedChainId, TradeType } from '@vvs-finance/swap-sdk';
import { splitMessage } from '../utils/messageSplitter.js';

export default class TradeBot {
  constructor(coins) {
    // Налаштування Telegram
    const TELEGRAM_TOKEN = '7613274289:AAGhvCGPaiPObvrCUAMMq-axczzLOtTQQVo';
    const CHAT_ID = '-1002453090771'; // Основна група для повідомлень
    const CHAT_ID_LOG = '-1002568698600'; // Група для логів
    this.telegram = new TelegramNotifier(TELEGRAM_TOKEN, CHAT_ID, CHAT_ID_LOG);

    // Налаштування Crypto.com API
    this.cryptoAPI = new CryptoComAPI();

    // Стандартна адреса токена USDC для свопів
    this.USDC = "0xc21223249ca28397b4b6541dffaecc539bff0c59";

    // Конфігурації монет
    this.coins = coins;
  }

  // Метод, який запускає 8 потоків паралельно
  async run() {
    console.log("Початок роботи в 8 потоках. Для завершення натисніть Ctrl+C.\n");
    await Promise.all(
      Array.from({ length: 8 }, (_, i) => this.runThread(i))
    );
  }

  // Потік обробки монет для даного індексу (0, 1, ..., 7)
  async runThread(threadIndex) {
    while (true) {
      let cycleLog = `Потік ${threadIndex}:\n`;
      const cycleStart = Date.now();

      // Відбираємо монети, індекс яких за модулем 8 дорівнює threadIndex
      const coinsForThread = this.coins.filter((_, index) => index % 8 === threadIndex);
      for (const coin of coinsForThread) {
        let coinLog = `Обробка монети: ${coin.name}\n`;
        try {
          const result1 = await this.scenario1(coin);
          const result2 = await this.scenario2(coin);
          coinLog += `Сценарій 1: Прибуток: ${result1.profit.toFixed(2)} USDC (${result1.percentProfit.toFixed(2)}%)\n`;
          coinLog += `Сценарій 2: Прибуток: ${result2.profit.toFixed(2)} USD (${result2.percentProfit.toFixed(2)}%)\n`;
        } catch (err) {
          console.error(`Помилка при обробці монети ${coin.name}:`, err);
          coinLog += `Помилка: ${err}\n`;
        }
        coinLog += "\n";
        cycleLog += coinLog;
      }

      const cycleEnd = Date.now();
      const cycleTime = (cycleEnd - cycleStart) / 1000;
      cycleLog += `Час циклу: ${cycleTime.toFixed(2)} секунд\n`;

      console.log(cycleLog);
      // Відправка накопичених логів
      const fullLogMessage = "LOG:\n" + cycleLog;
      const logChunks = splitMessage(fullLogMessage, 4000);
      for (const chunk of logChunks) {
        await this.telegram.sendLog(chunk);
      }

      // Затримка перед наступним циклом
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Сценарій 1: Купівля монети за USD на Crypto.com, потім своп монети в USDC
  async scenario1(coin) {
    const usdBudget = coin.buyAmount;
    console.log(`Сценарій 1 для ${coin.name}: (${usdBudget} USD -> ${coin.name} на Crypto.com -> своп (${coin.name} -> USDC))`);

    // Купівля монети через Crypto.com із зазначеним тегом
    const coinBought = await this.cryptoAPI.simulateBuyCrypto(usdBudget, coin.cryptoTag);
    console.log(`За ${usdBudget.toFixed(2)} USD куплено ${coin.name}: ${coinBought.toFixed(4)} ${coin.name}`);

    // Виконуємо своп: монета → USDC
    const tradeCoinToUSDC = await SwapService.swap(
      SupportedChainId.CRONOS_MAINNET,
      coin.contract,
      this.USDC,
      coinBought,
      2,
      TradeType.EXACT_INPUT
    );
    const usdcReceived = SwapService.fractionToDecimal(tradeCoinToUSDC.amountOut.amount);
    const profit = usdcReceived - usdBudget;
    const percentProfit = (profit / usdBudget) * 100;

    console.log(`Після свопу отримано USDC: ${usdcReceived.toFixed(2)}`);
    console.log(`Чистий результат: ${profit.toFixed(2)} USDC (${percentProfit >= 0 ? '+' : ''}${percentProfit.toFixed(2)}%)`);

    if (percentProfit >= coin.notificationThreshold) {
      const message =
        `${coin.name} (Crypto.com->CRONOS: ${coin.name}->USDC)\n` +
        `Прибуток: ${profit.toFixed(2)} USDC (${percentProfit.toFixed(2)}%)\n` +
        `Куплено ${coin.name}: ${coinBought.toFixed(4)} ${coin.name}\n` +
        `Після свопу отримано USDC: ${usdcReceived.toFixed(2)}`;
      await this.telegram.sendMainMessage(message);
    }

    return { profit, percentProfit };
  }

  // Сценарій 2: Свап USDC на монету, потім продаж монети на Crypto.com
  async scenario2(coin) {
    const usdcBudget = coin.swapAmount;
    console.log(`Сценарій 2 для ${coin.name}: (${usdcBudget} USDC -> свап (USDC -> ${coin.name}) -> продаж ${coin.name} на Crypto.com)`);

    const tradeUSDCTOCoin = await SwapService.swap(
      SupportedChainId.CRONOS_MAINNET,
      this.USDC,
      coin.contract,
      usdcBudget,
      2,
      TradeType.EXACT_INPUT
    );
    const coinReceived = SwapService.fractionToDecimal(tradeUSDCTOCoin.amountOut.amount);
    console.log(`За ${usdcBudget.toFixed(2)} USDC отримано ${coin.name}: ${coinReceived.toFixed(4)} ${coin.name}`);

    const usdFromSell = await this.cryptoAPI.simulateSellCrypto(coinReceived, coin.cryptoTag);
    const profit = usdFromSell - usdcBudget;
    const percentProfit = (profit / usdcBudget) * 100;

    console.log(`При продажі отримано USD: ${usdFromSell.toFixed(2)}`);
    console.log(`Чистий результат: ${profit.toFixed(2)} USD (${percentProfit >= 0 ? '+' : ''}${percentProfit.toFixed(2)}%)`);

    if (percentProfit >= coin.notificationThreshold) {
      const message =
        `${coin.name} (CRONOS->Crypto.com: USDC->${coin.name})\n` +
        `Прибуток: ${profit.toFixed(2)} USD (${percentProfit.toFixed(2)}%)\n` +
        `Своп отримав ${coin.name}: ${coinReceived.toFixed(4)} ${coin.name}\n` +
        `Продаж ${coin.name} дав USD: ${usdFromSell.toFixed(2)}`;
      await this.telegram.sendMainMessage(message);
    }

    return { profit, percentProfit };
  }
}

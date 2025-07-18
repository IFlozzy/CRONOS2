export default class CryptoComAPI {
  constructor() {
    this.ORDER_BOOK_URL = "https://api.crypto.com/v2/public/get-book";
  }

  async asyncGetOrderBook(instrumentName = "TRUMP_USD", depth = 10) {
    const params = new URLSearchParams({
      instrument_name: instrumentName,
      depth: depth,
    });
    const response = await fetch(`${this.ORDER_BOOK_URL}?${params.toString()}`);
    const data = await response.json();
    let buyOrders = [];
    let sellOrders = [];
    if (data.code === 0 && data.result) {
      const ordersData = data.result.data[0];
      buyOrders = ordersData.bids ? ordersData.bids.slice(0, 10) : [];
      sellOrders = ordersData.asks ? ordersData.asks.slice(0, 10) : [];
    }
    return { buyOrders, sellOrders };
  }

  // Симуляція купівлі монети (без комісії спочатку)
  async simulateBuyCrypto(usdBudget, instrumentName = "TRUMP_USD") {
    const { sellOrders } = await this.asyncGetOrderBook(instrumentName, 10);
    if (sellOrders.length === 0) {
      console.log("❌ Не вдалося отримати ордери на продаж із Crypto.com.");
      return 0.0;
    }
    let remaining = usdBudget;
    let totalCoin = 0.0;
    for (const order of sellOrders) {
      const price = parseFloat(order[0]);
      const available = parseFloat(order[1]);
      let quantity = remaining / price;
      if (quantity > available) {
        quantity = available;
      }
      if (quantity <= 0) continue;
      const cost = quantity * price;
      remaining -= cost;
      totalCoin += quantity;
      if (remaining <= 0) break;
    }
    const COMMISSION_RATE = 0.005; // 0.5% комісія
    return totalCoin * (1 - COMMISSION_RATE);
  }

  // Симуляція продажу монети (без комісії спочатку)
  async simulateSellCrypto(coinAmount, instrumentName = "TRUMP_USD") {
    const { buyOrders } = await this.asyncGetOrderBook(instrumentName, 10);
    if (buyOrders.length === 0) {
      console.log("❌ Не вдалося отримати ордери на покупку із Crypto.com.");
      return 0.0;
    }
    let totalUsd = 0.0;
    let remaining = coinAmount;
    for (const order of buyOrders) {
      const price = parseFloat(order[0]);
      const available = parseFloat(order[1]);
      const quantity = Math.min(remaining, available);
      if (quantity <= 0) continue;
      const earned = quantity * price;
      remaining -= quantity;
      totalUsd += earned;
      if (remaining <= 0) break;
    }
    const COMMISSION_RATE = 0.005; // 0.5% комісія
    return totalUsd * (1 - COMMISSION_RATE);
  }
}

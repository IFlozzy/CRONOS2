import { fetchBestTrade, SupportedChainId, TradeType } from '@vvs-finance/swap-sdk';

export default class SwapService {
  // Допоміжна функція для перетворення Fraction у десяткове число
  static fractionToDecimal(fraction) {
    return Number(fraction.numerator) / Number(fraction.denominator);
  }

  // Виконує своп через fetchBestTrade
  static async swap(chainId, fromToken, toToken, amount, maxHops = 2, tradeType = TradeType.EXACT_INPUT) {
    return await fetchBestTrade(chainId, fromToken, toToken, amount.toString(), { maxHops, tradeType });
  }
}

import type { PriceResponse } from '../types/index.js';

export class PriceService {
  private cache: Record<string, number> = {
    USDC: 1.00,
    EURC: 1.09,
    ETH: 3250.00,
    cirBTC: 95000.00,
    USDT: 1.00,
  };
  private lastUpdated: Date = new Date();
  private ttlSeconds: number = parseInt(process.env.PRICE_CACHE_TTL_SECONDS || '60', 10);

  constructor() {
    // Background refresh simulation/polling
    setInterval(() => this.refreshPrices(), 30000);
  }

  private async refreshPrices(): Promise<void> {
    try {
      // Simulate minor fluctuation in mock price feed or real fetch
      const jitter = (Math.random() - 0.5) * 0.002; // ±0.1%
      this.cache.EURC = parseFloat((1.09 + jitter).toFixed(4));
      this.cache.ETH = parseFloat((3250.0 + jitter * 1000).toFixed(2));
      this.cache.cirBTC = parseFloat((95000.0 + jitter * 10000).toFixed(2));
      this.lastUpdated = new Date();
    } catch (err) {
      console.warn('[PriceService] Failed to refresh prices, serving cached values:', err);
    }
  }

  public getPrices(requestedTokens?: string[]): PriceResponse {
    let resultPrices = { ...this.cache };

    if (requestedTokens && requestedTokens.length > 0) {
      const filtered: Record<string, number> = {};
      for (const token of requestedTokens) {
        const uppercaseToken = token.trim().toUpperCase();
        if (uppercaseToken in this.cache) {
          filtered[uppercaseToken] = this.cache[uppercaseToken];
        }
      }
      resultPrices = filtered;
    }

    return {
      prices: resultPrices,
      updatedAt: this.lastUpdated.toISOString(),
      source: 'coingecko_cached',
    };
  }
}

export const priceService = new PriceService();

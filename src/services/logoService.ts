/**
 * Logo Service
 * Provides real logos for companies and cryptocurrencies
 */

export const logoService = {
  getLogoUrl: (symbol: string, cat?: string): string => {
    if (!symbol) return "";
    
    const cleanSymbol = symbol.split(".")[0].toUpperCase();
    const lowerSymbol = cleanSymbol.toLowerCase();

    // 1. Crypto (Binance/Coincap)
    if (cat === "CRYPTO" || symbol.endsWith("USDT")) {
      const cryptoSymbol = cleanSymbol.replace("USDT", "").toLowerCase();
      return `https://assets.coincap.io/assets/icons/${cryptoSymbol}@2x.png`;
    }

    // 2. Indian Equity (NSE/BSE via Groww)
    if (cat === "INDIAN_EQUITY" || symbol.endsWith(".NS") || symbol.endsWith(".BO")) {
      return `https://assets-netstorage.groww.in/stock-assets/logos/GSTK${cleanSymbol}.png`;
    }

    // 3. US Equity (Clearbit)
    if (cat === "US_EQUITY" || (!symbol.includes("=") && !symbol.includes("."))) {
      // Common mappings for US stocks that don't follow symbol.com
      const mappings: Record<string, string> = {
        "AAPL": "apple.com",
        "MSFT": "microsoft.com",
        "GOOGL": "google.com",
        "AMZN": "amazon.com",
        "TSLA": "tesla.com",
        "NVDA": "nvidia.com",
        "META": "meta.com",
        "NFLX": "netflix.com",
        "AMD": "amd.com",
        "JPM": "jpmorganchase.com"
      };
      const domain = mappings[cleanSymbol] || `${lowerSymbol}.com`;
      return `https://logo.clearbit.com/${domain}`;
    }

    // 4. Fallback: Initials
    return `https://api.dicebear.com/7.x/initials/svg?seed=${cleanSymbol}&backgroundColor=151619&fontFamily=Arial&fontWeight=700`;
  }
};

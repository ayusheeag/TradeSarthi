export const CATS = {
  INDIAN_EQUITY: { id: "INDIAN_EQUITY", label: "Indian Equity", icon: "https://flagcdn.com/w80/in.png", color: "#FF9933", source: "DHAN", exchanges: ["NSE", "BSE"], isLive: true },
  US_EQUITY: { id: "US_EQUITY", label: "US Equity", icon: "https://flagcdn.com/w80/us.png", color: "#3B82F6", source: "YAHOO", exchanges: ["NASDAQ", "NYSE", "AMEX"], isLive: false },
  COMMODITIES: { id: "COMMODITIES", label: "Commodities", icon: "https://img.icons8.com/color/96/gold-bars.png", color: "#F59E0B", source: "DHAN", exchanges: ["MCX", "COMEX"], isLive: true },
  CURRENCIES: { id: "CURRENCIES", label: "Currencies", icon: "💱", color: "#10B981", source: "YAHOO", exchanges: ["FOREX"], isLive: false },
  CRYPTO: { id: "CRYPTO", label: "Crypto", icon: "₿", color: "#8B5CF6", source: "BINANCE", exchanges: ["Binance"], isLive: true },
} as const;

export const TFS = [
  { id: "5m", label: "5m" }, { id: "15m", label: "15m" }, { id: "1H", label: "1H" },
  { id: "4H", label: "4H" }, { id: "1D", label: "1D" }, { id: "1W", label: "1W" },
] as const;

export const WATCHLIST: Record<string, string[]> = {
  INDIAN_EQUITY: ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS", "SBIN.NS", "BHARTIARTL.NS", "ITC.NS", "TATAMOTORS.NS", "WIPRO.NS"],
  US_EQUITY: ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "JPM", "AMD", "NFLX"],
  COMMODITIES: ["GC=F", "SI=F", "HG=F", "CL=F", "NG=F", "XAUUSD=X"],
  CURRENCIES: ["EURUSD=X", "GBPUSD=X", "USDJPY=X", "USDINR=X", "AUDUSD=X", "USDCAD=X"],
  CRYPTO: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "AVAXUSDT"],
};

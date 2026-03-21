export const CATS = {
  INDIAN_EQUITY: { id: "INDIAN_EQUITY", label: "Indian Equity", icon: "🇮🇳", color: "#FF9933", source: "YAHOO", exchanges: ["NSE", "BSE"], isLive: false },
  US_EQUITY: { id: "US_EQUITY", label: "US Equity", icon: "🇺🇸", color: "#3B82F6", source: "YAHOO", exchanges: ["NASDAQ", "NYSE", "AMEX"], isLive: false },
  COMMODITIES: { id: "COMMODITIES", label: "Commodities", icon: "⛏️", color: "#F59E0B", source: "YAHOO", exchanges: ["COMEX"], isLive: false },
  CURRENCIES: { id: "CURRENCIES", label: "Currencies", icon: "💱", color: "#10B981", source: "YAHOO", exchanges: ["FOREX"], isLive: false },
  CRYPTO: { id: "CRYPTO", label: "Crypto", icon: "₿", color: "#8B5CF6", source: "BINANCE", exchanges: ["Binance"], isLive: true },
} as const;

export const TFS = [
  { id: "5m", label: "5m" }, { id: "15m", label: "15m" }, { id: "1H", label: "1H" },
  { id: "4H", label: "4H" }, { id: "1D", label: "1D" }, { id: "1W", label: "1W" },
] as const;

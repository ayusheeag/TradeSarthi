import { Ticker, OHLCData } from "../types";
import { CATS } from "../constants";

let _bnCache: any[] | null = null, _bnCacheT = 0;

async function bnSymbols() {
  if (_bnCache && Date.now() - _bnCacheT < 3600000) return _bnCache;
  try {
    const r = await fetch("https://api.binance.com/api/v3/exchangeInfo");
    if (!r.ok) throw 0;
    const d = await r.json();
    _bnCache = (d.symbols || []).filter((s: any) => s.quoteAsset === "USDT" && s.status === "TRADING");
    _bnCacheT = Date.now();
    return _bnCache;
  } catch { return []; }
}

export function demoTickers(cat: string, q: string): Ticker[] {
  const T: Record<string, any[]> = {
    INDIAN_EQUITY: [{ symbol: "RELIANCE.NS", name: "Reliance Industries", exchange: "NSE" }, { symbol: "TCS.NS", name: "Tata Consultancy Services", exchange: "NSE" }, { symbol: "HDFCBANK.NS", name: "HDFC Bank", exchange: "NSE" }, { symbol: "INFY.NS", name: "Infosys", exchange: "NSE" }, { symbol: "ICICIBANK.NS", name: "ICICI Bank", exchange: "NSE" }, { symbol: "SBIN.NS", name: "State Bank of India", exchange: "NSE" }, { symbol: "BHARTIARTL.NS", name: "Bharti Airtel", exchange: "NSE" }, { symbol: "ITC.NS", name: "ITC Limited", exchange: "NSE" }, { symbol: "TATAMOTORS.NS", name: "Tata Motors", exchange: "NSE" }, { symbol: "WIPRO.NS", name: "Wipro", exchange: "NSE" }, { symbol: "AXISBANK.NS", name: "Axis Bank", exchange: "NSE" }, { symbol: "BAJFINANCE.NS", name: "Bajaj Finance", exchange: "NSE" }, { symbol: "LT.NS", name: "Larsen & Toubro", exchange: "NSE" }, { symbol: "MARUTI.NS", name: "Maruti Suzuki", exchange: "NSE" }, { symbol: "TITAN.NS", name: "Titan Company", exchange: "NSE" }],
    US_EQUITY: [{ symbol: "AAPL", name: "Apple Inc", exchange: "NASDAQ" }, { symbol: "MSFT", name: "Microsoft Corp", exchange: "NASDAQ" }, { symbol: "GOOGL", name: "Alphabet Inc", exchange: "NASDAQ" }, { symbol: "AMZN", name: "Amazon.com Inc", exchange: "NASDAQ" }, { symbol: "TSLA", name: "Tesla Inc", exchange: "NASDAQ" }, { symbol: "NVDA", name: "NVIDIA Corp", exchange: "NASDAQ" }, { symbol: "META", name: "Meta Platforms", exchange: "NASDAQ" }, { symbol: "JPM", name: "JPMorgan Chase", exchange: "NYSE" }, { symbol: "AMD", name: "AMD", exchange: "NASDAQ" }, { symbol: "NFLX", name: "Netflix", exchange: "NASDAQ" }],
    COMMODITIES: [{ symbol: "GC=F", name: "Gold Futures", exchange: "COMEX" }, { symbol: "SI=F", name: "Silver Futures", exchange: "COMEX" }, { symbol: "HG=F", name: "Copper Futures", exchange: "COMEX" }, { symbol: "XAUUSD=X", name: "Gold Spot", exchange: "COMEX" }],
    CURRENCIES: [{ symbol: "EURUSD=X", name: "Euro/USD", exchange: "FOREX" }, { symbol: "GBPUSD=X", name: "GBP/USD", exchange: "FOREX" }, { symbol: "USDJPY=X", name: "USD/JPY", exchange: "FOREX" }, { symbol: "USDINR=X", name: "USD/INR", exchange: "FOREX" }, { symbol: "AUDUSD=X", name: "AUD/USD", exchange: "FOREX" }, { symbol: "USDCAD=X", name: "USD/CAD", exchange: "FOREX" }],
    CRYPTO: [{ symbol: "BTCUSDT", name: "BTC/USDT", exchange: "Binance" }, { symbol: "ETHUSDT", name: "ETH/USDT", exchange: "Binance" }, { symbol: "SOLUSDT", name: "SOL/USDT", exchange: "Binance" }, { symbol: "BNBUSDT", name: "BNB/USDT", exchange: "Binance" }, { symbol: "XRPUSDT", name: "XRP/USDT", exchange: "Binance" }, { symbol: "ADAUSDT", name: "ADA/USDT", exchange: "Binance" }, { symbol: "DOGEUSDT", name: "DOGE/USDT", exchange: "Binance" }, { symbol: "AVAXUSDT", name: "AVAX/USDT", exchange: "Binance" }],
  };
  const l = q.toLowerCase();
  return (T[cat] || []).filter(t => t.symbol.toLowerCase().includes(l) || t.name.toLowerCase().includes(l)).map(t => ({ ...t, id: t.symbol }));
}

export function demoOHLC(sym: string, n = 200): OHLCData[] {
  const d: OHLCData[] = []; let seed = 0;
  for (let i = 0; i < sym.length; i++) seed += sym.charCodeAt(i);
  const base = 100 + (seed % 900); let p = base; const now = Date.now();
  for (let i = 0; i < n; i++) {
    const rng = () => { seed = (seed * 16807 + 7) % 2147483647; return (seed % 1000) / 1000; };
    const vol = p * 0.02, trend = Math.sin(i / 30) * 0.3, ch = (rng() - 0.48 + trend * 0.1) * vol;
    p = Math.max(p + ch, 1);
    const o = p, h = o + rng() * vol, l = o - rng() * vol, c = l + rng() * (h - l); p = c;
    d.push({ time: now - (n - i) * 86400000, open: +o.toFixed(2), high: +h.toFixed(2), low: +l.toFixed(2), close: +c.toFixed(2), volume: Math.floor(50000 + rng() * 500000) });
  }
  return d;
}

export const dataAdapter = {
  YAHOO: {
    search: async (q: string, ex?: string) => {
      try {
        let query = q;
        if (ex === "NSE" && !q.endsWith(".NS")) query = `${q}.NS`;
        if (ex === "BSE" && !q.endsWith(".BO")) query = `${q}.BO`;

        const r = await fetch(`/api/yahoo/search/${encodeURIComponent(query)}?quotesCount=10&newsCount=0`);
        if (!r.ok) throw 0;
        const d = await r.json();
        return (d.quotes || []).filter((x: any) => {
          const isType = ["EQUITY", "ETF", "INDEX", "FUTURE", "CURRENCY"].includes(x.quoteType);
          if (ex === "COMEX") return isType && (x.exchange === "CMX" || x.exchange === "NYM" || x.symbol.endsWith("=F"));
          if (ex === "FOREX") return x.quoteType === "CURRENCY" && x.symbol.includes("USD");
          return isType;
        })
          .map((x: any) => ({
            symbol: x.symbol,
            name: x.shortname || x.longname || x.symbol,
            exchange: x.exchange || (x.symbol.endsWith(".NS") ? "NSE" : x.symbol.endsWith(".BO") ? "BSE" : "NASDAQ"),
            id: x.symbol
          }));
      } catch { return demoTickers(ex === "NSE" || ex === "BSE" ? "INDIAN_EQUITY" : "US_EQUITY", q); }
    },
    ohlc: async (sym: string, ex: string, tf: string) => {
      const iMap: any = { "5m": "5m", "15m": "15m", "1H": "1h", "4H": "4h", "1D": "1d", "1W": "1wk" };
      const rMap: any = { "5m": "5d", "15m": "14d", "1H": "1mo", "4H": "3mo", "1D": "1y", "1W": "5y" };
      try {
        const r = await fetch(`/api/yahoo/chart/${encodeURIComponent(sym)}?interval=${iMap[tf] || "1d"}&range=${rMap[tf] || "1y"}`);
        if (!r.ok) throw 0;
        const d = await r.json(), res = d.chart?.result?.[0]; if (!res?.timestamp) return null;
        const q = res.indicators.quote[0];
        return res.timestamp.map((t: any, i: number) => ({ time: t * 1000, open: q.open[i], high: q.high[i], low: q.low[i], close: q.close[i], volume: q.volume[i] })).filter((c: any) => c.open != null);
      } catch { return null; }
    },
  },
  TWELVE_DATA: {
    search: async (q: string, ex: string) => {
      try {
        const r = await fetch(`/api/twelvedata/symbol_search?symbol=${encodeURIComponent(q)}`);
        if (!r.ok) throw 0;
        const d = await r.json();
        return (d.data || [])
          .filter((t: any) => {
            if (ex === "FOREX") {
              const sym = (t.symbol || "").toUpperCase();
              // Be very lenient with instrument types for Forex search
              const isForex = !t.instrument_type || 
                             t.instrument_type.toLowerCase().includes("forex") || 
                             t.instrument_type.toLowerCase().includes("currency") ||
                             t.type === "Forex";
              return isForex && sym.includes("USD");
            }
            if (ex === "COMEX") return t.exchange === "COMEX";
            return true;
          })
          .slice(0, 12)
          .map((t: any) => ({ 
            symbol: t.symbol, 
            name: t.instrument_name, 
            exchange: t.exchange || ex, 
            id: `${t.symbol}:${t.exchange}` 
          }));
      } catch { return demoTickers(ex === "FOREX" ? "CURRENCIES" : "COMMODITIES", q); }
    },
    ohlc: async (sym: string, ex: string, tf: string) => {
      const iMap: any = { "5m": "5min", "15m": "15min", "1H": "1h", "4H": "4h", "1D": "1day", "1W": "1week" };
      const sMap: any = { "5m": 500, "15m": 400, "1H": 300, "4H": 200, "1D": 365, "1W": 200 };
      try {
        const r = await fetch(`/api/twelvedata/time_series?symbol=${encodeURIComponent(sym)}&exchange=${encodeURIComponent(ex)}&interval=${iMap[tf] || "1day"}&outputsize=${sMap[tf] || 200}`);
        if (!r.ok) throw 0;
        const d = await r.json(); if (d.status === "error") return null;
        return (d.values || []).reverse().map((v: any) => ({ time: new Date(v.datetime).getTime(), open: +v.open, high: +v.high, low: +v.low, close: +v.close, volume: +(v.volume || 0) }));
      } catch { return null; }
    },
  },
  BINANCE: {
    search: async (q: string) => {
      const syms = await bnSymbols(); const u = q.toUpperCase();
      return syms.filter((s: any) => s.symbol.includes(u) || s.baseAsset.includes(u)).slice(0, 12)
        .map((s: any) => ({ symbol: s.symbol, name: `${s.baseAsset}/USDT`, exchange: "Binance", id: s.symbol }));
    },
    ohlc: async (sym: string, ex: string, tf: string) => {
      const iMap: any = { "5m": "5m", "15m": "15m", "1H": "1h", "4H": "4h", "1D": "1d", "1W": "1w" };
      const lMap: any = { "5m": 500, "15m": 500, "1H": 500, "4H": 300, "1D": 365, "1W": 200 };
      try {
        const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${sym}&interval=${iMap[tf] || "1d"}&limit=${lMap[tf] || 200}`);
        if (!r.ok) throw 0;
        return (await r.json()).map((k: any) => ({ time: k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5] }));
      } catch { return null; }
    },
  },
};

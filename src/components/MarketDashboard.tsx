import React, { useState, useEffect, useCallback, useMemo } from "react";
import { WATCHLIST, CATS } from "../constants";
import { dataAdapter } from "../services/dataService";
import { geminiService, TradeSuggestion } from "../services/geminiService";
import { Badge } from "./UI";
import { TrendingUp, TrendingDown, Target, Activity, RefreshCw, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MarketDashboardProps {
  cat: string;
  source: string;
  onPick: (ticker: any) => void;
}

export const MarketDashboard: React.FC<MarketDashboardProps> = ({ cat, source, onPick }) => {
  const [stats, setStats] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<TradeSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let data: any[] = [];
      if (cat === "INDIAN_EQUITY") {
        data = await dataAdapter.getNSEGainersLosers();
      } else {
        const symbols = WATCHLIST[cat] || [];
        data = await dataAdapter.getWatchlistStats(symbols, source);
      }
      setStats(data);

      // Fetch suggestions using the live stats
      if (data.length > 0) {
        const trades = await geminiService.getTradeSuggestions(cat, data.slice(0, 10));
        setSuggestions(trades);
      }
    } catch (e) {
      setError("Failed to load market data");
    }
    setLoading(false);
  }, [cat, source]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const gainers = useMemo(() => [...stats].sort((a, b) => b.changePct - a.changePct).slice(0, 3), [stats]);
  const losers = useMemo(() => [...stats].sort((a, b) => a.changePct - b.changePct).slice(0, 3), [stats]);

  const lastActiveDate = useMemo(() => {
    if (stats.length === 0) return "";
    const lastOhlc = stats[0].ohlc;
    if (!lastOhlc || lastOhlc.length === 0) return new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    return new Date(lastOhlc[lastOhlc.length - 1].time).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }, [stats]);

  const isMarketOpen = useMemo(() => {
    if (stats.length === 0) return false;
    const lastOhlc = stats[0].ohlc;
    if (!lastOhlc || lastOhlc.length === 0) {
      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay();
      // Indian market hours: 9:15 AM to 3:30 PM, Mon-Fri
      return day >= 1 && day <= 5 && (hour > 9 || (hour === 9 && now.getMinutes() >= 15)) && (hour < 15 || (hour === 15 && now.getMinutes() <= 30));
    }
    return (Date.now() - lastOhlc[lastOhlc.length - 1].time) < 86400000;
  }, [stats]);

  if (loading) {
    return (
      <div className="space-y-6 py-4">
        <div className="h-40 bg-white/5 rounded-3xl animate-pulse" />
        <div className="h-40 bg-white/5 rounded-3xl animate-pulse" />
        <div className="h-64 bg-white/5 rounded-3xl animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 py-4"
    >
      {/* GAINERS & LOSERS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* TOP GAINERS */}
        <div className="card !p-4 sm:!p-5">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-bull" />
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-white/30">Top Gainers</span>
              {!isMarketOpen && <Badge type="neutral" xs>Closed ({lastActiveDate})</Badge>}
            </div>
            <button onClick={fetchData} className="text-white/20 hover:text-white/40 active:rotate-180 transition-transform">
              <RefreshCw size={12} />
            </button>
          </div>
          <div className="space-y-2 sm:space-y-3">
            {gainers.map((s, i) => (
              <button 
                key={s.symbol}
                onClick={() => onPick({ 
                  symbol: s.symbol, 
                  id: s.id || s.symbol, 
                  exchange: s.exchange || "NSE",
                  exchange_segment: s.exchange_segment,
                  name: s.name
                })}
                className="w-full flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-bull/5 border border-bull/10 hover:bg-bull/10 transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-bull/10 flex items-center justify-center overflow-hidden">
                    {CATS[cat as keyof typeof CATS]?.icon.startsWith("http") ? (
                      <img src={CATS[cat as keyof typeof CATS].icon} alt="" className="w-4 h-4 sm:w-5 sm:h-5 object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-[10px] sm:text-xs">{CATS[cat as keyof typeof CATS]?.icon}</span>
                    )}
                  </div>
                  <div className="text-left">
                    <div className="text-xs sm:text-sm font-bold font-mono">{s.symbol.split(".")[0]}</div>
                    <div className="text-[9px] sm:text-[10px] text-white/30 font-mono">{s.price.toFixed(1)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs sm:text-sm font-bold text-bull font-mono">+{s.changePct.toFixed(1)}%</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* TOP LOSERS */}
        <div className="card !p-4 sm:!p-5">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-2">
              <TrendingDown size={14} className="text-bear" />
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-white/30">Top Losers</span>
            </div>
          </div>
          <div className="space-y-2 sm:space-y-3">
            {losers.map((s, i) => (
              <button 
                key={s.symbol}
                onClick={() => onPick({ 
                  symbol: s.symbol, 
                  id: s.id || s.symbol, 
                  exchange: s.exchange || "NSE",
                  exchange_segment: s.exchange_segment,
                  name: s.name
                })}
                className="w-full flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-bear/5 border border-bear/10 hover:bg-bear/10 transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-bear/10 flex items-center justify-center overflow-hidden">
                    {CATS[cat as keyof typeof CATS]?.icon.startsWith("http") ? (
                      <img src={CATS[cat as keyof typeof CATS].icon} alt="" className="w-4 h-4 sm:w-5 sm:h-5 object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-[10px] sm:text-xs">{CATS[cat as keyof typeof CATS]?.icon}</span>
                    )}
                  </div>
                  <div className="text-left">
                    <div className="text-xs sm:text-sm font-bold font-mono">{s.symbol.split(".")[0]}</div>
                    <div className="text-[9px] sm:text-[10px] text-white/30 font-mono">{s.price.toFixed(1)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs sm:text-sm font-bold text-bear font-mono">{s.changePct.toFixed(1)}%</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TRADE SUGGESTIONS */}
      <div className="card !p-4 sm:!p-5">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            <Target size={14} className="text-accent" />
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-white/30">Scalp Suggestions (15m)</span>
          </div>
          <Badge type="info" xs>AI</Badge>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {suggestions.length > 0 ? suggestions.map((t, i) => (
            <div key={i} className="p-4 sm:p-5 rounded-[24px] sm:rounded-[32px] bg-white/5 border border-white/10 space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden">
                    {CATS[cat as keyof typeof CATS]?.icon.startsWith("http") ? (
                      <img src={CATS[cat as keyof typeof CATS].icon} alt="" className="w-4 h-4 sm:w-5 sm:h-5 object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-[10px] sm:text-xs">{CATS[cat as keyof typeof CATS]?.icon}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <div className="text-xs sm:text-sm font-bold font-mono">{t.symbol.split(".")[0]}</div>
                    <Badge type={t.type === "BUY" ? "bullish" : "bearish"} xs>{t.type}</Badge>
                  </div>
                </div>
                <button 
                  onClick={() => onPick({ 
                    symbol: t.symbol, 
                    id: t.id || t.symbol, 
                    exchange: t.exchange || "NSE",
                    name: t.symbol
                  })}
                  className="text-accent text-[9px] sm:text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"
                >
                  Analyze <ChevronRight size={12} />
                </button>
              </div>
              
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white/5 border border-white/5">
                  <div className="text-[8px] sm:text-[9px] text-white/20 font-bold uppercase tracking-widest mb-1 sm:mb-1.5">Entry</div>
                  <div className="text-[10px] sm:text-xs font-bold font-mono">{t.entry.toFixed(1)}</div>
                </div>
                <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-bull/5 border border-bull/10">
                  <div className="text-[8px] sm:text-[9px] text-bull/40 font-bold uppercase tracking-widest mb-1 sm:mb-1.5">Target</div>
                  <div className="text-[10px] sm:text-xs font-bold font-mono text-bull">{t.target.toFixed(1)}</div>
                </div>
                <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-bear/5 border border-bear/10">
                  <div className="text-[8px] sm:text-[9px] text-bear/40 font-bold uppercase tracking-widest mb-1 sm:mb-1.5">SL</div>
                  <div className="text-[10px] sm:text-xs font-bold font-mono text-bear">{t.sl.toFixed(1)}</div>
                </div>
              </div>
              
              <p className="text-[10px] sm:text-[11px] text-white/40 leading-relaxed italic">
                "{t.reason}"
              </p>
            </div>
          )) : (
            <div className="text-center py-10 text-white/20 text-sm font-medium">No suggestions available</div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

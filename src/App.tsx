import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { CATS, TFS } from "./constants";
import { Ticker, AnalysisResult, OHLCData } from "./types";
import { dataAdapter, demoOHLC } from "./services/dataService";
import { TA } from "./services/taService";
import { CandleChart } from "./components/CandleChart";
import { Gauge, Badge, Dot, Logo } from "./components/UI";
import { motion, AnimatePresence } from "motion/react";
import { Settings, Search, X, TrendingUp, TrendingDown, Activity, Layers, Target, BarChart3, ChevronRight, Info, RefreshCw, Zap } from "lucide-react";
import { lcService, LCSocialData } from "./services/lunarcrushService";

export default function App() {
  const [cat, setCat] = useState<keyof typeof CATS>("CRYPTO");
  const [ex, setEx] = useState("Binance");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Ticker[]>([]);
  const [ticker, setTicker] = useState<Ticker | null>(null);
  const [tf, setTf] = useState("1D");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [tab, setTab] = useState("overview");
  const [ds, setDs] = useState<{ live: boolean; src: string; n: number; why?: string } | null>(null);
  const [social, setSocial] = useState<LCSocialData | null>(null);
  const dbRef = useRef<any>(null);

  const C = CATS[cat];

  // Search
  useEffect(() => {
    if (!q || q.length < 1) { setResults([]); return; }
    clearTimeout(dbRef.current);
    dbRef.current = setTimeout(async () => {
      const a = (dataAdapter as any)[C.source];
      if (a) setResults(await a.search(q, ex));
    }, 250);
    return () => clearTimeout(dbRef.current);
  }, [q, cat, ex, C.source]);

  useEffect(() => {
    setEx(CATS[cat].exchanges[0]);
    setQ("");
    setResults([]);
    setTicker(null);
    setAnalysis(null);
    setDs(null);
    setSocial(null);
  }, [cat]);

  const analyze = useCallback(async (tk: Ticker, useTf?: string) => {
    setLoading(true);
    setDs(null);
    const t = useTf || tf;
    try {
      const a = (dataAdapter as any)[C.source];
      let ohlc = await a?.ohlc(tk.symbol, tk.exchange || ex, t, tk);
      if (ohlc && ohlc.length >= 30) {
        setDs({ live: true, src: a.name, n: ohlc.length });
      } else {
        setDs({ live: false, src: "Demo", n: 200, why: "Using demo data" });
        ohlc = demoOHLC(tk.symbol);
      }
      const r = TA.run(ohlc);
      setAnalysis(r);
      setTab("overview");
    } catch (e: any) {
      setDs({ live: false, src: "Demo", n: 200, why: e.message });
      setAnalysis(TA.run(demoOHLC(tk.symbol)));
    }
    setLoading(false);
  }, [C.source, ex, tf]);

  const pick = (t: Ticker) => {
    setTicker(t);
    setQ(t.symbol);
    setShowSearch(false);
    setResults([]);
    setSocial(null);
    analyze(t);
    lcService.getSocial(t.symbol, cat).then(setSocial);
  };

  useEffect(() => {
    if (ticker) analyze(ticker, tf);
  }, [tf, analyze, ticker]);

  const fmt = (n: number | null, d = 2) => {
    if (n == null || isNaN(n)) return "—";
    const v = Number(n);
    if (Math.abs(v) >= 10000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
    if (Math.abs(v) >= 1) return v.toFixed(d);
    if (Math.abs(v) < 0.01) return v.toFixed(6);
    return v.toFixed(d);
  };

  const fV = (v: number) => {
    if (!v) return "—";
    if (v >= 1e9) return (v / 1e9).toFixed(1) + "B";
    if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
    if (v >= 1e3) return (v / 1e3).toFixed(0) + "K";
    return v.toFixed(0);
  };

  const A = analysis;

  return (
    <div className="min-h-screen bg-bg text-[#E8E9ED] font-sans max-w-[480px] mx-auto relative pb-28">
      {/* TOP BAR */}
      <header className="px-6 py-6 sticky top-0 bg-bg/80 backdrop-blur-xl z-50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Logo size={44} />
            <div>
              <h1 className="text-xl font-bold tracking-tight">Trade Saarthi</h1>
              <div className="flex items-center gap-1.5">
                <Dot on={ds?.live ?? false} />
                <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">
                  {ds?.live ? (C.isLive ? "Live Feed" : "Delayed/EOD") : "Demo Mode"}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setShowSearch(true)}
            title="Search Assets"
            className="w-10 h-10 rounded-full glass flex items-center justify-center text-white/60 active:scale-90 transition-transform"
          >
            <Search size={18} />
          </button>
        </div>

        {/* Categories - Pill Style */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {Object.values(CATS).map(c => (
            <button
              key={c.id}
              onClick={() => setCat(c.id as any)}
              className={`flex-none flex items-center gap-2 px-4 py-2.5 rounded-full text-[11px] font-bold transition-all border ${
                cat === c.id
                  ? "bg-white text-black border-white"
                  : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
              }`}
            >
              <span>{c.icon}</span>
              {c.label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-6">
        <AnimatePresence>
          {showSearch && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-[100] bg-bg/95 backdrop-blur-xl p-6"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="flex-1 flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 h-14 focus-within:border-accent transition-colors">
                  <Search size={20} className="text-white/20" />
                  <input
                    autoFocus
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    placeholder={`Search ${C.label}...`}
                    className="flex-1 bg-transparent border-none outline-none text-base font-medium placeholder:text-white/10"
                  />
                </div>
                <button 
                  onClick={() => setShowSearch(false)}
                  title="Close Search"
                  className="w-14 h-14 rounded-2xl glass flex items-center justify-center text-white/60"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-2 max-h-[70vh] overflow-y-auto no-scrollbar">
                {results.length > 0 ? results.map((r, i) => (
                  <button
                    key={`${r.symbol}-${i}`}
                    onClick={() => pick(r)}
                    className="w-full flex items-center justify-between p-5 glass rounded-2xl text-left active:scale-[0.98] transition-transform"
                  >
                    <div>
                      <div className="text-sm font-bold font-mono">{r.symbol}</div>
                      <div className="text-[11px] text-white/30 mt-1">{r.name}</div>
                    </div>
                    <Badge type="info" xs>{r.exchange}</Badge>
                  </button>
                )) : q.length > 0 ? (
                  <div className="text-center py-20 text-white/20 text-sm font-medium">No results found for "{q}"</div>
                ) : (
                  <div className="text-center py-20 text-white/20 text-sm font-medium">Start typing to search symbols</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="space-y-6 py-4">
            <div className="h-32 bg-white/5 rounded-3xl animate-pulse" />
            <div className="h-64 bg-white/5 rounded-3xl animate-pulse" />
            <div className="h-40 bg-white/5 rounded-3xl animate-pulse" />
          </div>
        ) : A && ticker ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 py-4">
            {/* PRICE CARD - MODERN GRADIENT */}
            <div className="relative p-6 rounded-[32px] bg-gradient-to-br from-white/10 to-transparent border border-white/10 overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-40 h-40 bg-accent/10 rounded-full blur-[80px] -mr-20 -mt-20" />
              
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl glass flex items-center justify-center font-bold text-xs">
                    {ticker.symbol.slice(0, 1)}
                  </div>
                  <div>
                    <div className="text-sm font-bold font-mono">{ticker.symbol}</div>
                    <div className="text-[10px] text-white/30 font-medium uppercase tracking-wider">{ticker.exchange || ex}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-1">
                    {["5m", "15m", "1H", "4H", "1D", "1W"].map(t => (
                      <button 
                        key={t} 
                        onClick={() => setTf(t)}
                        className={`text-[9px] font-bold px-2 py-1 rounded-lg transition-colors ${tf === t ? "bg-white text-black" : "text-white/20 hover:text-white/40"}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={() => ticker && analyze(ticker)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass text-[10px] font-bold text-accent hover:bg-white/10 transition-all active:scale-95"
                  >
                    <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                    RECHECK
                  </button>
                </div>
              </div>

              <div className="flex items-baseline gap-3 mb-8">
                <span className="text-4xl font-bold font-mono tracking-tighter">{fmt(A.price.current)}</span>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold font-mono ${Number(A.price.change) >= 0 ? "bg-bull/10 text-bull" : "bg-bear/10 text-bear"}`}>
                  {Number(A.price.change) >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {A.price.changePct}%
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 pt-6 border-t border-white/5">
                {[
                  { l: "Open", v: A.price.open },
                  { l: "High", v: A.price.high },
                  { l: "Low", v: A.price.low },
                  { l: "Vol", v: A.price.volume, isV: true }
                ].map(i => (
                  <div key={i.l}>
                    <div className="text-[9px] text-white/20 font-bold uppercase tracking-widest mb-1.5">{i.l}</div>
                    <div className="text-[11px] font-bold font-mono">{i.isV ? fV(i.v as number) : fmt(i.v as number)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* CHART CARD */}
            <div className="card !p-0 overflow-hidden shadow-xl">
              <div className="p-4 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-2">
                  <BarChart3 size={14} className="text-white/40" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Price Action</span>
                </div>
                <div className="flex gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span className="text-[8px] text-white/30 font-mono">SMA20</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span className="text-[8px] text-white/30 font-mono">SMA50</span>
                  </div>
                </div>
              </div>
              <CandleChart data={A.raw} analysis={A} color={C.color} height={220} />
            </div>

            {/* SENTIMENT CARD */}
            <div className="card relative overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">Market Sentiment</div>
                <Badge type={A.verdict.bullPct >= 60 ? "bullish" : A.verdict.bearPct >= 60 ? "bearish" : "neutral"}>
                  {A.verdict.label}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4 mb-2">
                <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden flex">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${A.verdict.bullPct}%` }}
                    className="h-full bg-bull shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                  />
                  <div className="flex-1 bg-bear/20" />
                </div>
              </div>
              <div className="flex justify-between text-[10px] font-bold font-mono">
                <span className="text-bull">BULLISH {A.verdict.bullPct}%</span>
                <span className="text-bear">BEARISH {A.verdict.bearPct}%</span>
              </div>
            </div>

            {/* ANALYSIS TABS */}
            <div className="flex gap-1 overflow-x-auto no-scrollbar py-1">
              {[
                { id: "overview", l: "Overview", icon: Activity },
                { id: "classic", l: "Classic", icon: BarChart3 },
                { id: "smc", l: "SMC/ICT", icon: Layers },
                { id: "levels", l: "Levels", icon: Target },
                { id: "patterns", l: "Patterns", icon: TrendingUp },
                { id: "social", l: "Social", icon: Zap }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[11px] font-bold transition-all whitespace-nowrap border ${
                    tab === t.id
                      ? "bg-white text-black border-white shadow-lg shadow-white/5"
                      : "bg-white/5 border-white/5 text-white/30 hover:text-white/50"
                  }`}
                >
                  <t.icon size={14} />
                  {t.l}
                </button>
              ))}
            </div>

            {/* TAB CONTENT */}
            <div className="min-h-[300px]">
              {tab === "overview" && (
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                  <div className="card">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-6">Momentum Gauges</div>
                    <div className="grid grid-cols-3 gap-4">
                      <Gauge value={A.classic.rsi} label="RSI (14)" zones={[{ from: 0, to: 30, color: "#10B981" }, { from: 30, to: 70, color: "#F59E0B" }, { from: 70, to: 100, color: "#EF4444" }]} />
                      <Gauge value={A.classic.stoch.k} label="Stoch %K" zones={[{ from: 0, to: 20, color: "#10B981" }, { from: 20, to: 80, color: "#F59E0B" }, { from: 80, to: 100, color: "#EF4444" }]} />
                      <div className="text-center">
                        <div className={`w-[60px] h-[60px] mx-auto mb-2 flex items-center justify-center rounded-2xl border ${A.classic.macd.histogram > 0 ? "bg-bull/5 border-bull/20 text-bull" : "bg-bear/5 border-bear/20 text-bear"}`}>
                          {A.classic.macd.histogram > 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                        </div>
                        <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest">MACD</div>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="flex justify-between items-center mb-6">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">Trend Strength (ADX)</div>
                      <Badge type={A.classic.adx.trend === "strong" ? "bullish" : "neutral"}>{A.classic.adx.trend}</Badge>
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, A.classic.adx.adx || 0)}%` }}
                          className={`h-full ${A.classic.adx.adx > 25 ? "bg-bull" : "bg-amber-500"}`}
                        />
                      </div>
                      <span className="text-base font-bold font-mono">{fmt(A.classic.adx.adx, 1)}</span>
                    </div>
                    <div className="flex gap-6 text-[11px] font-bold font-mono">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-bull" />
                        <span className="text-bull">DI+ {fmt(A.classic.adx.diP, 1)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-bear" />
                        <span className="text-bear">DI- {fmt(A.classic.adx.diN, 1)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {tab === "classic" && (
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                  <div className="card">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-bold">RSI Analysis</span>
                      <span className={`text-xl font-bold font-mono ${A.classic.rsi > 70 ? "text-bear" : A.classic.rsi < 30 ? "text-bull" : "text-amber-400"}`}>
                        {fmt(A.classic.rsi, 1)}
                      </span>
                    </div>
                    <p className="text-xs text-white/40 leading-relaxed">
                      {A.classic.rsi > 70 ? "Market is overextended. High probability of a pullback or consolidation phase." : A.classic.rsi < 30 ? "Market is oversold. Potential for a relief rally or trend reversal." : "RSI is in neutral territory. Trend continuation remains the primary scenario."}
                    </p>
                  </div>
                  <div className="card">
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-sm font-bold">MACD Components</span>
                      <Badge type={A.classic.macd.histogram > 0 ? "bullish" : "bearish"}>{A.classic.macd.histogram > 0 ? "Bullish" : "Bearish"}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-6">
                      {[
                        { l: "MACD", v: A.classic.macd.value },
                        { l: "Signal", v: A.classic.macd.signal },
                        { l: "Hist", v: A.classic.macd.histogram }
                      ].map(i => (
                        <div key={i.l}>
                          <div className="text-[9px] text-white/20 font-bold uppercase tracking-widest mb-1.5">{i.l}</div>
                          <div className={`text-sm font-bold font-mono ${i.v >= 0 ? "text-bull" : "text-bear"}`}>{fmt(i.v, 4)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {tab === "smc" && (
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                  <div className="card">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <Layers size={16} className="text-purple-400" />
                        <span className="text-sm font-bold">Smart Money OBs</span>
                      </div>
                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{A.smc.orderBlocks.length} Zones</span>
                    </div>
                    <div className="space-y-3">
                      {A.smc.orderBlocks.length === 0 ? (
                        <div className="text-xs text-white/20 py-6 text-center border border-dashed border-white/5 rounded-2xl">No unmitigated OBs found.</div>
                      ) : (
                        A.smc.orderBlocks.map((ob, i) => (
                          <div key={i} className={`flex justify-between items-center p-4 rounded-2xl border ${ob.type === "bullish" ? "bg-bull/5 border-bull/10" : "bg-bear/5 border-bear/10"}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-1 h-8 rounded-full ${ob.type === "bullish" ? "bg-bull" : "bg-bear"}`} />
                              <div>
                                <div className="text-xs font-bold uppercase tracking-wider">{ob.type} OB</div>
                                <div className="text-[10px] text-white/30 mt-0.5">Strength: {ob.strength.toFixed(1)}x</div>
                              </div>
                            </div>
                            <div className="text-right font-mono">
                              <div className="text-sm font-bold">{fmt(ob.high)}</div>
                              <div className="text-[11px] text-white/30">{fmt(ob.low)}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {tab === "levels" && (
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                  <div className="card">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-6">Key Price Levels</div>
                    <div className="space-y-3">
                      {A.sr.map((lv, i) => {
                        const dist = ((lv.price - A.price.current) / A.price.current * 100).toFixed(1);
                        return (
                          <div key={i} className={`flex justify-between items-center p-4 rounded-2xl border ${lv.type === "resistance" ? "bg-bear/5 border-bear/10" : "bg-bull/5 border-bull/10"}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${lv.type === "resistance" ? "bg-bear/10 text-bear" : "bg-bull/10 text-bull"}`}>
                                {lv.type === "resistance" ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                              </div>
                              <div>
                                <div className="text-xs font-bold uppercase tracking-wider">{lv.type}</div>
                                <div className="text-[10px] text-white/30 mt-0.5">{lv.touches} Rejections</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold font-mono">{fmt(lv.price)}</div>
                              <div className={`text-[11px] font-bold font-mono ${Number(dist) > 0 ? "text-bear" : "text-bull"}`}>{Number(dist) > 0 ? "+" : ""}{dist}%</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {tab === "patterns" && (
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                  <div className="card">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-6">Detected Patterns</div>
                    <div className="space-y-3">
                      {A.patterns.length === 0 ? (
                        <div className="text-xs text-white/20 py-10 text-center border border-dashed border-white/5 rounded-2xl">Scanning for patterns...</div>
                      ) : (
                        A.patterns.map((p, i) => (
                          <div key={i} className={`flex justify-between items-center p-4 rounded-2xl border ${p.type === "bullish" ? "bg-bull/5 border-bull/10" : p.type === "bearish" ? "bg-bear/5 border-bear/10" : "bg-white/5 border-white/10"}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${p.type === "bullish" ? "bg-bull/10 text-bull" : p.type === "bearish" ? "bg-bear/10 text-bear" : "bg-white/10 text-white/40"}`}>
                                <TrendingUp size={20} />
                              </div>
                              <div>
                                <div className="text-sm font-bold">{p.name}</div>
                                <div className="text-[10px] text-white/30 mt-0.5 uppercase font-bold tracking-widest">{p.sig} CONFIDENCE</div>
                              </div>
                            </div>
                            <Badge type={p.type}>{p.type}</Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {tab === "social" && (
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                  {social ? (
                    <>
                      <div className="card">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-6">Social Intelligence · LunarCrush</div>
                        <div className="grid grid-cols-2 gap-4">
                          {[
                            { l: "Galaxy Score", v: social.galaxyScore != null ? `${social.galaxyScore}/100` : "—", color: social.galaxyScore != null && social.galaxyScore >= 60 ? "text-bull" : social.galaxyScore != null && social.galaxyScore < 40 ? "text-bear" : "text-amber-400" },
                            { l: "Alt Rank", v: social.altRank != null ? `#${social.altRank.toLocaleString()}` : "—", color: "text-white" },
                            { l: "Sentiment", v: social.sentiment != null ? `${social.sentiment.toFixed(1)}%` : "—", color: social.sentiment != null && social.sentiment >= 60 ? "text-bull" : social.sentiment != null && social.sentiment < 40 ? "text-bear" : "text-amber-400" },
                            { l: "Social Dom.", v: social.socialDominance != null ? `${social.socialDominance.toFixed(2)}%` : "—", color: "text-white" },
                          ].map(item => (
                            <div key={item.l} className="bg-white/5 rounded-2xl p-4 border border-white/5">
                              <div className="text-[9px] text-white/20 font-bold uppercase tracking-widest mb-2">{item.l}</div>
                              <div className={`text-xl font-bold font-mono ${item.color}`}>{item.v}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="card">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-6">Social Activity</div>
                        <div className="space-y-4">
                          {[
                            { l: "Total Engagements", v: social.interactions != null ? social.interactions.toLocaleString() : "—" },
                            { l: "Active Mentions", v: social.postsActive != null ? social.postsActive.toLocaleString() : "—" },
                            { l: "Unique Creators", v: social.contributorsActive != null ? social.contributorsActive.toLocaleString() : "—" },
                          ].map(item => (
                            <div key={item.l} className="flex justify-between items-center">
                              <span className="text-xs text-white/40">{item.l}</span>
                              <span className="text-sm font-bold font-mono">{item.v}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {social.sentiment != null && (
                        <div className="card">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-4">Community Sentiment</div>
                          <div className="flex items-center gap-4 mb-2">
                            <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden flex">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${social.sentiment}%` }}
                                className="h-full bg-bull shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                              />
                              <div className="flex-1 bg-bear/20" />
                            </div>
                          </div>
                          <div className="flex justify-between text-[10px] font-bold font-mono">
                            <span className="text-bull">BULLISH {social.sentiment.toFixed(1)}%</span>
                            <span className="text-bear">BEARISH {(100 - social.sentiment).toFixed(1)}%</span>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="card text-center py-16">
                      <Zap size={32} className="mx-auto mb-4 text-white/10" />
                      <div className="text-sm font-bold text-white/20 mb-2">No Social Data</div>
                      <div className="text-xs text-white/10">LunarCrush data unavailable for this asset.<br />Ensure LUNARCRUSH_API_KEY is configured.</div>
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            <footer className="text-center py-12 opacity-20">
              <div className="text-[9px] font-bold uppercase tracking-[0.4em]">Trade Saarthi v2.0 · Pro Grade Analysis</div>
            </footer>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center px-10">
            <div className="w-24 h-24 bg-white/5 rounded-[40px] flex items-center justify-center mb-8 border border-white/10 shadow-2xl">
              <Activity size={40} className="text-white/10" />
            </div>
            <h2 className="text-2xl font-bold mb-3 tracking-tight">Market Intelligence</h2>
            <p className="text-sm text-white/30 leading-relaxed">
              Search for any asset to unlock institutional-grade technical analysis and smart money insights.
            </p>
            <button 
              onClick={() => setShowSearch(true)}
              className="mt-10 btn-primary w-full shadow-xl shadow-white/5"
            >
              Start Analysis
            </button>
          </div>
        )}
      </main>

      {/* BOTTOM NAVIGATION - ERGONOMIC PILL */}
      <div className="fixed bottom-8 left-6 right-6 max-w-[432px] mx-auto z-[100]">
        <nav className="glass rounded-[32px] p-2 flex justify-between items-center shadow-2xl">
          {[
            { id: "overview", icon: Activity, label: "Overview" },
            { id: "smc", icon: Layers, label: "SMC/ICT" },
            { id: "levels", icon: Target, label: "Levels" },
            { id: "patterns", icon: TrendingUp, label: "Patterns" }
          ].map(t => (
            <button 
              key={t.id}
              onClick={() => setTab(t.id)} 
              title={t.label}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-[24px] transition-all ${tab === t.id ? "bg-white text-black shadow-lg" : "text-white/30 hover:text-white/50"}`}
            >
              <t.icon size={20} />
              <span className="text-[8px] font-bold uppercase tracking-tighter">{t.label}</span>
            </button>
          ))}
          <div className="w-px h-8 bg-white/10 mx-1" />
          <button 
            onClick={() => setShowSearch(true)}
            title="Search Assets"
            className="w-14 h-14 rounded-full bg-accent flex flex-col items-center justify-center text-white shadow-lg shadow-accent/20 active:scale-90 transition-transform"
          >
            <Search size={20} />
            <span className="text-[8px] font-bold uppercase mt-0.5">Search</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

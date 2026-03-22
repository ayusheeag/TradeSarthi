import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { CATS, TFS } from "./constants";
import { Ticker, AnalysisResult, OHLCData } from "./types";
import { dataAdapter, demoOHLC } from "./services/dataService";
import { logoService } from "./services/logoService";
import { TA } from "./services/taService";
import { CandleChart } from "./components/CandleChart";
import { Gauge, Badge, Logo, SaarthiAnimator } from "./components/UI";
import { MarketDashboard } from "./components/MarketDashboard";
import { FundamentalDashboard } from "./components/FundamentalDashboard";
import { motion, AnimatePresence } from "motion/react";
import { Settings, Search, X, TrendingUp, TrendingDown, Activity, Layers, Target, BarChart3, ChevronRight, Info, RefreshCw, Menu, PieChart, Download, Share2 } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export default function App() {
  const [cat, setCat] = useState<keyof typeof CATS>("INDIAN_EQUITY");
  const [ex, setEx] = useState("NSE");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Ticker[]>([]);
  const [ticker, setTicker] = useState<Ticker | null>(null);
  const [tf, setTf] = useState("1D");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [tab, setTab] = useState("overview");
  const [viewMode, setViewMode] = useState<"technical" | "fundamental">("technical");

  // Intersection Observer for active tab highlighting
  useEffect(() => {
    if (!ticker) return;
    if (viewMode === "technical" && !analysis) return;
    
    const options = {
      root: null,
      rootMargin: '-100px 0px -50% 0px',
      threshold: 0.3
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setTab(entry.target.id);
        }
      });
    }, options);

    const sectionIds = viewMode === "fundamental" 
      ? ["overview", "pl-analysis", "swot", "shareholders", "news"]
      : ["overview", "classic", "smc", "levels", "patterns"];
      
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [ticker, analysis, viewMode]);
  const [ds, setDs] = useState<{ live: boolean; src: string; n: number; why?: string } | null>(null);
  const dbRef = useRef<any>(null);

  const C = CATS[cat];
  
  // Pre-load
  useEffect(() => {
    dataAdapter.preLoad();
  }, []);

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

  const cacheRef = useRef<Record<string, { analysis: AnalysisResult, ds: any, timestamp: number }>>({});

  const analyze = useCallback(async (tk: Ticker, useTf?: string) => {
    const t = useTf || tf;
    const cacheKey = `${tk.id}-${tk.exchange || ex}-${t}-${C.source}`;
    const now = Date.now();

    if (cacheRef.current[cacheKey] && now - cacheRef.current[cacheKey].timestamp < 30 * 60 * 1000) {
      setDs(cacheRef.current[cacheKey].ds);
      setAnalysis(cacheRef.current[cacheKey].analysis);
      return;
    }

    setLoading(true);
    setDs(null);
    try {
      const a = (dataAdapter as any)[C.source];
      let ohlc = await a?.ohlc(tk.id, tk.exchange || ex, t, tk);
      let newDs;
      if (ohlc && ohlc.length >= 30) {
        newDs = { live: true, src: C.source, n: ohlc.length };
      } else {
        newDs = { live: false, src: "Demo", n: 200, why: "Using demo data" };
        ohlc = demoOHLC(tk.symbol);
      }
      const r = TA.run(ohlc);
      cacheRef.current[cacheKey] = { analysis: r, ds: newDs, timestamp: now };
      setDs(newDs);
      setAnalysis(r);
    } catch (e: any) {
      const newDs = { live: false, src: "Demo", n: 200, why: e.message };
      const r = TA.run(demoOHLC(tk.symbol));
      cacheRef.current[cacheKey] = { analysis: r, ds: newDs, timestamp: now };
      setDs(newDs);
      setAnalysis(r);
    }
    setLoading(false);
  }, [C.source, ex, tf]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.ticker) {
        setCat(e.state.cat);
        setEx(e.state.ex);
        const tk = { ...e.state.ticker, exchange: e.state.ex };
        setTicker(tk);
        setQ(tk.symbol);
        setTab("overview");
        analyze(tk);
      } else if (e.state && e.state.cat) {
        setCat(e.state.cat);
        setEx(CATS[e.state.cat as keyof typeof CATS].exchanges[0]);
        setTicker(null);
        setAnalysis(null);
        setQ("");
        setDs(null);
      } else {
        setTicker(null);
        setAnalysis(null);
        setQ("");
        setDs(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [analyze]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const symbol = url.searchParams.get('symbol');
    const id = url.searchParams.get('id');
    const name = url.searchParams.get('name');
    const urlCat = url.searchParams.get('cat');
    const exchange = url.searchParams.get('exchange');
    
    if (symbol && id && name && urlCat) {
      const t: Ticker = { symbol, id, name, exchange: exchange || undefined };
      setCat(urlCat as keyof typeof CATS);
      if (exchange) setEx(exchange);
      setTicker(t);
      setQ(symbol);
      setTab("overview");
      analyze(t);
      window.history.replaceState({ ticker: t, cat: urlCat, ex: exchange }, '', url.toString());
    } else if (urlCat) {
      setCat(urlCat as keyof typeof CATS);
      setEx(CATS[urlCat as keyof typeof CATS].exchanges[0]);
      window.history.replaceState({ cat: urlCat }, '', url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const pick = (t: Ticker) => {
    setTicker(t);
    setQ(t.symbol);
    setShowSearch(false);
    setResults([]);
    setTab("overview");
    
    const url = new URL(window.location.href);
    url.searchParams.set('symbol', t.symbol);
    url.searchParams.set('id', t.id);
    url.searchParams.set('name', t.name);
    url.searchParams.set('cat', cat);
    if (t.exchange) url.searchParams.set('exchange', t.exchange);
    window.history.pushState({ ticker: t, cat, ex: t.exchange || ex }, '', url.toString());
    
    analyze(t);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === "Escape") {
        setShowSearch(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (ticker) analyze(ticker, tf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tf]);

  const fmt = useCallback((n: number | null, d = 2) => {
    if (n == null || isNaN(n)) return "—";
    return Number(n).toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
  }, []);

  const fV = useCallback((v: number) => {
    if (!v) return "—";
    if (v >= 1e7) return (v / 1e7).toFixed(2) + "Cr";
    if (v >= 1e5) return (v / 1e5).toFixed(2) + "L";
    if (v >= 1e3) return (v / 1e3).toFixed(2) + "K";
    return v.toFixed(0);
  }, []);

  const analysisRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const exportPDF = async () => {
    if (!analysisRef.current || !ticker) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(analysisRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#050505"
      });
      
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error("Canvas is empty");
      }
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }

      pdf.save(`TradeSaarthi_${ticker.symbol}_Analysis.pdf`);
    } catch (err) {
      console.error("Failed to export PDF", err);
    }
    setIsExporting(false);
  };

  const shareAnalysis = async () => {
    if (!ticker || !analysis) return;
    const text = `Trade Saarthi Analysis for ${ticker.symbol}\nTrend: ${analysis.trend.direction}\nPrice: ${analysis.price.current}\n\nCheck it out on Trade Saarthi!`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Trade Saarthi: ${ticker.symbol}`,
          text: text,
          url: window.location.href,
        });
      } catch (err) {
        console.error("Share failed", err);
      }
    } else {
      navigator.clipboard.writeText(text + "\n" + window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  const A = useMemo(() => analysis, [analysis]);

  return (
    <div className="min-h-screen bg-bg text-[#E8E9ED] font-sans max-w-[480px] mx-auto relative pb-28">
      {/* TOP-LEFT MENU DRAWER */}
      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMenu(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110]"
            />
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              className="fixed inset-y-0 left-0 w-[80%] max-w-[320px] bg-bg border-r border-white/10 z-[120] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <Logo size={32} />
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold tracking-tight text-white leading-none">Trade</span>
                      <div className="text-xs font-medium text-accent">
                        <SaarthiAnimator />
                      </div>
                    </div>
                    <span className="text-[8px] text-white/40 uppercase tracking-widest font-medium mt-0.5">Built in India for traders across globe</span>
                  </div>
                </div>
                <button onClick={() => setShowMenu(false)} className="text-white/30 p-2"><X size={20} /></button>
              </div>
              
                <div className="space-y-1">
                  <button 
                    onClick={() => { setViewMode("technical"); setShowMenu(false); }}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl text-left group transition-all ${viewMode === "technical" ? "bg-accent/10 border border-accent/20 text-white" : "hover:bg-white/5 text-white/60"}`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform ${viewMode === "technical" ? "bg-accent/20 text-accent group-hover:scale-110" : "bg-white/5 text-white/40"}`}>
                      <Activity size={18} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">Technical Analysis</span>
                      <span className={`text-[10px] font-medium ${viewMode === "technical" ? "text-accent/60" : "text-white/30"}`}>Live Market Data</span>
                    </div>
                  </button>
                  
                  <button 
                    onClick={() => { 
                      setViewMode("fundamental"); 
                      if (cat !== "INDIAN_EQUITY" && cat !== "US_EQUITY") {
                        setCat("INDIAN_EQUITY");
                        setEx("NSE");
                      }
                      setShowMenu(false); 
                    }}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl text-left group transition-all ${viewMode === "fundamental" ? "bg-accent/10 border border-accent/20 text-white" : "hover:bg-white/5 text-white/60"}`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform ${viewMode === "fundamental" ? "bg-accent/20 text-accent group-hover:scale-110" : "bg-white/5 text-white/40"}`}>
                      <PieChart size={18} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">Fundamental Analysis</span>
                      <span className={`text-[10px] font-medium ${viewMode === "fundamental" ? "text-accent/60" : "text-white/30"}`}>News & Events</span>
                    </div>
                  </button>

                  <div className="w-full flex items-center justify-between p-4 rounded-2xl text-white/20 border border-transparent opacity-60 grayscale">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                        <Target size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">Valuation Analysis</span>
                        <span className="text-[10px] text-white/20 font-medium">Coming Soon</span>
                      </div>
                    </div>
                    <Badge type="neutral" xs>Soon</Badge>
                  </div>
                </div>

              <div className="absolute bottom-8 left-6 right-6">
                <div className="p-4 rounded-2xl bg-accent/5 border border-accent/10">
                  <p className="text-[10px] text-accent font-bold uppercase tracking-widest mb-1">Pro Tip</p>
                  <p className="text-[11px] text-white/40 leading-relaxed">Use ⌘K to quickly search any asset from anywhere.</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* TOP BAR */}
      <header className="px-4 py-3 sm:px-6 sm:py-6 sticky top-0 bg-bg/80 backdrop-blur-xl z-50 border-b border-white/5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            {!ticker ? (
              <button 
                onClick={() => setShowMenu(true)}
                className="w-9 h-9 rounded-xl glass flex items-center justify-center text-white/60 active:scale-90 transition-transform"
              >
                <Menu size={18} />
              </button>
            ) : (
              <button 
                onClick={() => {
                  setTicker(null);
                  setAnalysis(null);
                  setQ("");
                  setDs(null);
                  
                  const url = new URL(window.location.href);
                  url.searchParams.delete('symbol');
                  url.searchParams.delete('id');
                  url.searchParams.delete('name');
                  url.searchParams.delete('exchange');
                  window.history.pushState({ cat }, '', url.toString());
                }}
                className="w-9 h-9 rounded-xl glass flex items-center justify-center text-white/60 active:scale-90 transition-transform"
              >
                <ChevronRight size={18} className="rotate-180" />
              </button>
            )}
            <div className="hidden xs:block">
              <div className="flex flex-col">
                <h1 className="text-sm sm:text-lg font-bold tracking-tight flex items-baseline gap-1.5">
                  Trade <SaarthiAnimator />
                </h1>
                <span className="text-[8px] text-white/40 uppercase tracking-widest font-medium">Built in India for traders across globe</span>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setShowSearch(true)}
            className="flex-1 h-10 px-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-white/20 active:scale-[0.98] transition-all group hover:border-white/20 hover:bg-white/[0.07]"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <Search size={14} className="flex-shrink-0 text-white/20 group-hover:text-white/40 transition-colors" />
              <span className="text-[10px] sm:text-[11px] font-medium tracking-tight truncate">
                {viewMode === "fundamental" ? "Search Fundamental Analysis..." : "Get Technical Analysis..."}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-mono text-white/20">
              <span className="text-[10px]">⌘</span>K
            </div>
          </button>
        </div>

        {/* Categories or Analysis Tabs - Sticky Sub-header */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {!ticker ? (
            Object.values(CATS)
              .filter(c => viewMode === "technical" || (c.id === "INDIAN_EQUITY" || c.id === "US_EQUITY"))
              .map(c => (
              <button
                key={c.id}
                onClick={() => {
                  setCat(c.id as any);
                  setEx(CATS[c.id as keyof typeof CATS].exchanges[0]);
                  setQ("");
                  setResults([]);
                  setTicker(null);
                  setAnalysis(null);
                  setDs(null);
                  
                  const url = new URL(window.location.href);
                  url.searchParams.delete('symbol');
                  url.searchParams.delete('id');
                  url.searchParams.delete('name');
                  url.searchParams.delete('exchange');
                  url.searchParams.set('cat', c.id);
                  window.history.pushState({ cat: c.id }, '', url.toString());
                }}
                className={`flex-none flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full text-[10px] sm:text-[11px] font-bold transition-all border ${
                  cat === c.id
                    ? "bg-white text-black border-white"
                    : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
                }`}
              >
                <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex items-center justify-center overflow-hidden rounded-sm">
                  {c.icon.startsWith("http") ? (
                    <img src={c.icon} alt={c.label} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    c.icon
                  )}
                </span>
                {c.label}
              </button>
            ))
          ) : (
            <div className="flex w-full bg-white/5 p-1 rounded-xl border border-white/5">
              {(viewMode === "fundamental" ? [
                { id: "overview", icon: Activity, label: "Overview" },
                { id: "pl-analysis", icon: BarChart3, label: "P&L Analysis" },
                { id: "swot", icon: Layers, label: "SWOT" },
                { id: "shareholders", icon: Target, label: "Shareholders" },
                { id: "news", icon: TrendingUp, label: "News" }
              ] : [
                { id: "overview", icon: Activity, label: "Overview" },
                { id: "classic", icon: BarChart3, label: "Classic" },
                { id: "smc", icon: Layers, label: "SMC/ICT" },
                { id: "levels", icon: Target, label: "Levels" },
                { id: "patterns", icon: TrendingUp, label: "Patterns" }
              ]).map(t => (
                <button 
                  key={t.id}
                  onClick={() => {
                    const el = document.getElementById(t.id);
                    if (el) {
                      const offset = 140; // Adjust for sticky header
                      const bodyRect = document.body.getBoundingClientRect().top;
                      const elementRect = el.getBoundingClientRect().top;
                      const elementPosition = elementRect - bodyRect;
                      const offsetPosition = elementPosition - offset;

                      window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                      });
                    }
                  }} 
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                    tab === t.id ? "bg-white text-black shadow-sm" : "text-white/30 hover:text-white/50"
                  }`}
                >
                  <t.icon size={14} />
                  <span className="text-[9px] font-bold uppercase tracking-tighter">{t.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="px-4 sm:px-6">
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
                    placeholder={viewMode === "fundamental" ? "Search Fundamental Analysis for any asset..." : "Get Technical Analysis for any asset..."}
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
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden p-1.5">
                        <img 
                          src={logoService.getLogoUrl(r.symbol, cat)} 
                          alt="" 
                          className="w-full h-full object-contain" 
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${r.symbol}&backgroundColor=151619`;
                          }}
                        />
                      </div>
                      <div>
                        <div className="text-sm font-bold font-mono tracking-tight">{r.symbol.split(".")[0]}</div>
                        <div className="text-[11px] text-white/30 mt-0.5 font-medium">{r.name}</div>
                      </div>
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

        {loading && viewMode === "technical" ? (
          <div className="space-y-6 py-4">
            <div className="h-32 bg-white/5 rounded-3xl animate-pulse" />
            <div className="h-64 bg-white/5 rounded-3xl animate-pulse" />
            <div className="h-40 bg-white/5 rounded-3xl animate-pulse" />
          </div>
        ) : viewMode === "fundamental" ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="pb-32 pt-4"
          >
            <FundamentalDashboard cat={cat} ticker={ticker} />
          </motion.div>
        ) : A && ticker ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 py-4">
            <div ref={analysisRef} className="space-y-6 bg-[#050505] p-2 -m-2 rounded-3xl">
              {/* PRICE CARD - MODERN GRADIENT */}
            <div className="relative p-5 sm:p-6 rounded-[28px] sm:rounded-[32px] bg-gradient-to-br from-white/10 to-transparent border border-white/10 overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-40 h-40 bg-accent/10 rounded-full blur-[80px] -mr-20 -mt-20" />
              
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden p-2">
                    <img 
                      src={logoService.getLogoUrl(ticker.symbol, cat)} 
                      alt="" 
                      className="w-full h-full object-contain" 
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${ticker.symbol}&backgroundColor=151619`;
                      }}
                    />
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-bold font-mono tracking-tight">{ticker.symbol.split(".")[0]}</div>
                    <div className="text-[9px] sm:text-[10px] text-white/30 font-bold uppercase tracking-widest">{ticker.exchange || ex}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 sm:gap-2">
                  <div className="flex gap-1">
                    {["5m", "15m", "1H", "1D"].map(t => (
                      <button 
                        key={t} 
                        onClick={() => setTf(t)}
                        className={`text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg transition-colors ${tf === t ? "bg-white text-black" : "text-white/20 hover:text-white/40"}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={shareAnalysis}
                      className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl glass text-[9px] sm:text-[10px] font-bold text-white/60 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                      title="Share Analysis"
                    >
                      <Share2 size={10} />
                      <span className="hidden sm:inline">SHARE</span>
                    </button>
                    <button 
                      onClick={exportPDF}
                      disabled={isExporting}
                      className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl glass text-[9px] sm:text-[10px] font-bold text-white/60 hover:text-white hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
                      title="Download PDF"
                    >
                      <Download size={10} className={isExporting ? "animate-bounce" : ""} />
                      <span className="hidden sm:inline">PDF</span>
                    </button>
                    <button 
                      onClick={() => ticker && analyze(ticker)}
                      className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl glass text-[9px] sm:text-[10px] font-bold text-accent hover:bg-white/10 transition-all active:scale-95"
                    >
                      <RefreshCw size={10} className={loading ? "animate-spin" : ""} />
                      RECHECK
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-baseline gap-2 sm:gap-3">
                  <span className="text-3xl sm:text-4xl font-bold font-mono tracking-tighter">{fmt(A.price.current)}</span>
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg text-[10px] sm:text-[11px] font-bold font-mono ${Number(A.price.change) >= 0 ? "bg-bull/10 text-bull" : "bg-bear/10 text-bear"}`}>
                    {Number(A.price.change) >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {Number(A.price.changePct).toFixed(2)}%
                  </div>
                </div>
                {A && (Date.now() - A.raw[A.raw.length - 1].time) >= 86400000 && (
                  <Badge type="neutral" xs>
                    Closed ({new Date(A.raw[A.raw.length - 1].time).toLocaleDateString("en-IN", { day: "numeric", month: "short" })})
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2 sm:gap-4 pt-4 sm:pt-6 border-t border-white/5">
                {[
                  { l: "Open", v: A.price.open },
                  { l: "High", v: A.price.high },
                  { l: "Low", v: A.price.low },
                  { l: "Vol", v: A.price.volume, isV: true }
                ].map(i => (
                  <div key={i.l}>
                    <div className="text-[8px] sm:text-[9px] text-white/20 font-bold uppercase tracking-widest mb-1 sm:mb-1.5">{i.l}</div>
                    <div className="text-[10px] sm:text-[11px] font-bold font-mono">{i.isV ? fV(i.v as number) : fmt(i.v as number)}</div>
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

            {/* ANALYSIS SECTIONS - SCROLLABLE */}
            <div className="space-y-8 pb-24">
              {/* OVERVIEW SECTION */}
              <section id="overview" className="space-y-4 scroll-mt-32">
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
                    <span className="text-base font-bold font-mono">{fmt(A.classic.adx.adx, 2)}</span>
                  </div>
                  <div className="flex gap-6 text-[11px] font-bold font-mono">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-bull" />
                      <span className="text-bull">DI+ {fmt(A.classic.adx.diP, 2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-bear" />
                      <span className="text-bear">DI- {fmt(A.classic.adx.diN, 2)}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* CLASSIC INDICATORS */}
              <section id="classic" className="space-y-4 scroll-mt-32">
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-1">Classic Indicators</div>
                <div className="card">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-bold">RSI Analysis</span>
                    <span className={`text-xl font-bold font-mono ${A.classic.rsi > 70 ? "text-bear" : A.classic.rsi < 30 ? "text-bull" : "text-amber-400"}`}>
                      {fmt(A.classic.rsi, 2)}
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
              </section>

              {/* SMC SECTION */}
              <section id="smc" className="space-y-4 scroll-mt-32">
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
                              <div className="text-[10px] text-white/30 mt-0.5">Strength: {ob.strength.toFixed(2)}x</div>
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
              </section>

              {/* LEVELS SECTION */}
              <section id="levels" className="space-y-4 scroll-mt-32">
                <div className="card">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-6">Key Price Levels</div>
                  <div className="space-y-3">
                    {A.sr.map((lv, i) => {
                      const dist = ((lv.price - A.price.current) / A.price.current * 100).toFixed(2);
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
              </section>

              {/* PATTERNS SECTION */}
              <section id="patterns" className="space-y-4 scroll-mt-32">
                <div className="card">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-6">Detected Patterns</div>
                  <div className="space-y-3">
                    {A.patterns.length === 0 ? (
                      <div className="text-xs text-white/20 py-10 text-center border border-dashed border-white/5 rounded-2xl">No patterns found in current timeframe.</div>
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
              </section>
            </div>

            </div>
            <footer className="text-center py-12 opacity-20">
              <div className="text-[9px] font-bold uppercase tracking-[0.4em]">Trade Saarthi v2.0 · Pro Grade Analysis</div>
            </footer>
          </motion.div>
        ) : (
          <MarketDashboard 
            cat={cat} 
            source={C.source} 
            onPick={pick} 
          />
        )}
      </main>

      {/* BOTTOM NAVIGATION - ERGONOMIC PILL */}
      <AnimatePresence>
        {ticker && (viewMode === "fundamental" || analysis) && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-6 right-6 max-w-[432px] mx-auto z-[100]"
          >
            <nav className="glass rounded-[32px] p-2 flex justify-between items-center shadow-2xl">
              <div className="flex-1 flex items-center justify-center px-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-white/60 truncate max-w-[120px]">{ticker.symbol}</span>
                  <span className="text-[8px] text-white/30 uppercase tracking-tighter">{tab} View</span>
                </div>
              </div>
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

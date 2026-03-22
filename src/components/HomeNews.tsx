import React, { useState, useEffect } from "react";
import { newsService, BSENews, MacroEvent, CorporateAction } from "../services/newsService";
import { dataAdapter } from "../services/dataService";
import { Badge } from "./UI";
import { Globe, Calendar, Briefcase, ExternalLink, Activity, TrendingUp, TrendingDown, Newspaper, Target } from "lucide-react";
import { motion } from "motion/react";

interface HomeNewsProps {
  cat: string;
}

export const HomeNews: React.FC<HomeNewsProps> = ({ cat }) => {
  const [bseNews, setBseNews] = useState<BSENews[]>([]);
  const [macroEvents, setMacroEvents] = useState<MacroEvent[]>([]);
  const [usCorpActions, setUsCorpActions] = useState<CorporateAction[]>([]);
  const [indCorpActions, setIndCorpActions] = useState<CorporateAction[]>([]);
  const [usTrackData, setUsTrackData] = useState<any>(null);
  const [globalNews, setGlobalNews] = useState<{headline: string, summary: string, source: string, time: string}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [bse, macro, usCorp, indCorp] = await Promise.all([
          newsService.getBSEAnnouncements(),
          newsService.getMacroEvents(),
          newsService.getUSCorporateActions(),
          newsService.getIndianCorporateActions()
        ]);
        setBseNews(bse || []);
        setMacroEvents(macro || []);
        setUsCorpActions(usCorp || []);
        setIndCorpActions(indCorp || []);
      } catch (err) {
        console.error("Failed to fetch news", err);
      }
      
      if (cat === "US_EQUITY") {
        try {
          const data = await dataAdapter.getWatchlistStats(["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA"], "YAHOO");
          setUsTrackData(data.filter(d => d !== null).map(d => ({
            name: d!.symbol,
            price: d!.price.toFixed(2),
            change: d!.change.toFixed(2),
            changePct: d!.changePct.toFixed(2)
          })));
        } catch (err) {
          console.error("Failed to fetch US track data", err);
        }
      }

      if (cat !== "INDIAN_EQUITY") {
        try {
          const news = await newsService.getGlobalNews(cat);
          setGlobalNews(news || []);
        } catch (err) {
          console.error("Failed to fetch global news", err);
        }
      }
      setLoading(false);
    };
    fetchAll();
  }, [cat]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-64 bg-white/5 rounded-3xl animate-pulse" />
          <div className="h-96 bg-white/5 rounded-3xl animate-pulse" />
        </div>
        <div className="space-y-6">
          <div className="h-80 bg-white/5 rounded-3xl animate-pulse" />
          <div className="h-80 bg-white/5 rounded-3xl animate-pulse" />
        </div>
      </div>
    );
  }

  const isIndia = cat === "INDIAN_EQUITY";
  const corpActions = isIndia ? indCorpActions : usCorpActions;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* LEFT COLUMN - MAIN CONTENT */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* MARKET PULSE / TRACK DATA */}
        {cat === "US_EQUITY" && usTrackData && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass p-6 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-[80px] -mr-32 -mt-32" />
            <div className="flex items-center gap-2 mb-6 text-accent">
              <Activity size={20} />
              <h3 className="text-sm font-bold uppercase tracking-widest">US Market Pulse</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Array.isArray(usTrackData) ? usTrackData.slice(0, 6).map((item: any, i: number) => (
                <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                  <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">{item.name || `Asset ${i+1}`}</div>
                  <div className="text-lg font-bold font-mono">{item.price || "—"}</div>
                  <div className={`text-xs font-bold mt-1 flex items-center gap-1 ${parseFloat(item.change) >= 0 ? 'text-bull' : 'text-bear'}`}>
                    {parseFloat(item.change) >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {item.changePct || "—"}%
                  </div>
                </div>
              )) : (
                <div className="col-span-full text-xs text-white/40 font-mono bg-white/5 p-4 rounded-xl overflow-x-auto">
                  {JSON.stringify(usTrackData, null, 2)}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* LATEST NEWS & ANNOUNCEMENTS */}
        {isIndia ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass p-6 rounded-3xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-bull">
                <Newspaper size={20} />
                <h3 className="text-sm font-bold uppercase tracking-widest">Live Exchange Announcements</h3>
              </div>
              <Badge type="neutral" xs>BSE India</Badge>
            </div>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {bseNews.length > 0 ? bseNews.map((n, i) => (
                <a 
                  key={i} 
                  href={n.ATTACHMENTNAME ? `https://www.bseindia.com/xml-data/corpfiling/AttachLive/${n.ATTACHMENTNAME}` : '#'} 
                  target="_blank" 
                  rel="noreferrer"
                  className="block p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[11px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md">{n.SLONGNAME}</span>
                        <span className="text-[10px] text-white/40 flex items-center gap-1"><Calendar size={10} /> {n.NEWS_DT}</span>
                      </div>
                      <div className="text-sm font-medium text-white/90 leading-relaxed group-hover:text-white transition-colors">{n.HEADLINE}</div>
                    </div>
                    {n.ATTACHMENTNAME && (
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-accent group-hover:text-white transition-colors">
                        <ExternalLink size={14} />
                      </div>
                    )}
                  </div>
                </a>
              )) : (
                <div className="text-center py-12 text-white/40 text-sm">No recent announcements found.</div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass p-6 rounded-3xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-bull">
                <Newspaper size={20} />
                <h3 className="text-sm font-bold uppercase tracking-widest">Market News & Insights</h3>
              </div>
              <Badge type="neutral" xs>{cat.replace("_", " ")}</Badge>
            </div>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {globalNews.length > 0 ? globalNews.map((n, i) => (
                <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md">{n.source}</span>
                    <span className="text-[10px] text-white/40 flex items-center gap-1"><Calendar size={10} /> {n.time}</span>
                  </div>
                  <div className="text-sm font-bold text-white/90 mb-1">{n.headline}</div>
                  <div className="text-xs text-white/60 leading-relaxed">{n.summary}</div>
                </div>
              )) : (
                <div className="text-center py-12 text-white/40 text-sm">No recent news found.</div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* RIGHT COLUMN - SIDEBAR */}
      <div className="space-y-6">
        
        {/* MACRO EVENTS */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass p-6 rounded-3xl">
          <div className="flex items-center gap-2 mb-6 text-amber-500">
            <Globe size={20} />
            <h3 className="text-sm font-bold uppercase tracking-widest">Macro Calendar</h3>
          </div>
          <div className="space-y-4">
            {macroEvents.slice(0, 5).map((e, i) => (
              <div key={i} className="relative pl-4 border-l-2 border-white/10 pb-4 last:pb-0 last:border-transparent">
                <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-white/20" />
                <div className="text-[10px] text-white/40 mb-1 flex items-center gap-2 font-mono">
                  {e.date} <span className="w-1 h-1 rounded-full bg-white/20" /> {e.country}
                </div>
                <div className="text-sm font-bold text-white/90 mb-2">{e.event}</div>
                <Badge type={e.impact === 'HIGH' ? 'danger' : e.impact === 'MEDIUM' ? 'warning' : 'info'} xs>
                  {e.impact} IMPACT
                </Badge>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CORPORATE ACTIONS */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass p-6 rounded-3xl">
          <div className="flex items-center gap-2 mb-6 text-indigo-400">
            <Briefcase size={20} />
            <h3 className="text-sm font-bold uppercase tracking-widest">Corporate Actions</h3>
          </div>
          <div className="space-y-3">
            {corpActions.slice(0, 6).map((c, i) => (
              <div key={i} className="p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono bg-white/10 px-1.5 py-0.5 rounded">{c.symbol}</span>
                  </div>
                  <Badge type="neutral" xs>{c.type}</Badge>
                </div>
                <div className="text-xs text-white/80 mb-2 line-clamp-2">{c.details}</div>
                <div className="text-[10px] text-white/40 flex items-center gap-1 font-mono">
                  <Calendar size={10} /> Ex-Date: {c.date}
                </div>
              </div>
            ))}
            {corpActions.length === 0 && (
              <div className="text-center py-8 text-white/40 text-xs">No upcoming actions</div>
            )}
          </div>
        </motion.div>

      </div>
    </div>
  );
};

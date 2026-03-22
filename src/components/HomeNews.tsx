import React, { useState, useEffect } from "react";
import { newsService, BSENews, MacroEvent, CorporateAction } from "../services/newsService";
import { Badge } from "./UI";
import { Globe, Calendar, Briefcase, ExternalLink, AlertTriangle, Activity } from "lucide-react";

interface HomeNewsProps {
  cat: string;
}

export const HomeNews: React.FC<HomeNewsProps> = ({ cat }) => {
  const [bseNews, setBseNews] = useState<BSENews[]>([]);
  const [macroEvents, setMacroEvents] = useState<MacroEvent[]>([]);
  const [usCorpActions, setUsCorpActions] = useState<CorporateAction[]>([]);
  const [indCorpActions, setIndCorpActions] = useState<CorporateAction[]>([]);
  const [usTrackData, setUsTrackData] = useState<any>(null);
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
          const res = await fetch("https://data.investing.com/api/s/track");
          if (res.ok) {
            const data = await res.json();
            setUsTrackData(data);
          }
        } catch (err) {
          console.error("Failed to fetch US track data", err);
        }
      }
      setLoading(false);
    };
    fetchAll();
  }, [cat]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-40 bg-white/5 rounded-3xl animate-pulse" />
        <div className="h-40 bg-white/5 rounded-3xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* MACRO EVENTS */}
      <div className="glass p-5 rounded-3xl">
        <div className="flex items-center gap-2 mb-4 text-accent">
          <Globe size={18} />
          <h3 className="text-sm font-bold uppercase tracking-widest">Upcoming Macro Events</h3>
        </div>
        <div className="space-y-3">
          {macroEvents.map((e, i) => (
            <div key={i} className="flex items-start justify-between gap-4 p-3 rounded-xl bg-white/5 border border-white/5">
              <div>
                <div className="text-xs font-bold text-white/90">{e.event}</div>
                <div className="text-[10px] text-white/40 mt-1 flex items-center gap-2">
                  <Calendar size={10} /> {e.date} • {e.country}
                </div>
              </div>
              <Badge type={e.impact === 'HIGH' ? 'danger' : e.impact === 'MEDIUM' ? 'warning' : 'info'} xs>
                {e.impact} IMPACT
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* CORPORATE ACTIONS / NEWS */}
      {cat === "INDIAN_EQUITY" ? (
        <div className="space-y-6">
          <div className="glass p-5 rounded-3xl">
            <div className="flex items-center gap-2 mb-4 text-bull">
              <Briefcase size={18} />
              <h3 className="text-sm font-bold uppercase tracking-widest">Indian Corporate Actions (7 Days)</h3>
            </div>
            <div className="space-y-3">
              {indCorpActions.map((c, i) => (
                <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono">{c.symbol}</span>
                      <span className="text-[10px] text-white/40">{c.company}</span>
                    </div>
                    <Badge type="info" xs>{c.type}</Badge>
                  </div>
                  <div className="text-[11px] text-white/80 mt-2">{c.details}</div>
                  <div className="text-[9px] text-white/40 mt-2 flex items-center gap-1">
                    <Calendar size={10} /> {c.date}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass p-5 rounded-3xl">
            <div className="flex items-center gap-2 mb-4 text-bull">
              <Briefcase size={18} />
              <h3 className="text-sm font-bold uppercase tracking-widest">BSE Live Announcements</h3>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto no-scrollbar">
              {bseNews.length > 0 ? bseNews.map((n, i) => (
                <a 
                  key={i} 
                  href={n.ATTACHMENTNAME ? `https://www.bseindia.com/xml-data/corpfiling/AttachLive/${n.ATTACHMENTNAME}` : '#'} 
                  target="_blank" 
                  rel="noreferrer"
                  className="block p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[10px] font-bold text-accent mb-1">{n.SLONGNAME}</div>
                      <div className="text-xs font-medium text-white/80 line-clamp-2">{n.HEADLINE}</div>
                    </div>
                    {n.ATTACHMENTNAME && <ExternalLink size={14} className="text-white/30 flex-shrink-0 mt-1" />}
                  </div>
                  <div className="text-[9px] text-white/40 mt-2">{n.NEWS_DT}</div>
                </a>
              )) : (
                <div className="text-center py-8 text-white/40 text-xs">No recent announcements found.</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {usTrackData && (
            <div className="glass p-5 rounded-3xl">
              <div className="flex items-center gap-2 mb-4 text-bull">
                <Activity size={18} />
                <h3 className="text-sm font-bold uppercase tracking-widest">US Market Track</h3>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto no-scrollbar">
                {Array.isArray(usTrackData) ? usTrackData.map((item: any, i: number) => (
                  <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/5">
                    {Object.entries(item).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-xs mb-1">
                        <span className="text-white/40 capitalize">{key}</span>
                        <span className="text-white/80 font-mono">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )) : (
                  <pre className="text-[10px] text-white/60 whitespace-pre-wrap font-mono bg-white/5 p-3 rounded-xl">
                    {JSON.stringify(usTrackData, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}

          <div className="glass p-5 rounded-3xl">
          <div className="flex items-center gap-2 mb-4 text-bull">
            <Briefcase size={18} />
            <h3 className="text-sm font-bold uppercase tracking-widest">US Corporate Actions (7 Days)</h3>
          </div>
          <div className="space-y-3">
            {usCorpActions.map((c, i) => (
              <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono">{c.symbol}</span>
                    <span className="text-[10px] text-white/40">{c.company}</span>
                  </div>
                  <Badge type="info" xs>{c.type}</Badge>
                </div>
                <div className="text-[11px] text-white/80 mt-2">{c.details}</div>
                <div className="text-[9px] text-white/40 mt-2 flex items-center gap-1">
                  <Calendar size={10} /> {c.date}
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
      )}
    </div>
  );
};

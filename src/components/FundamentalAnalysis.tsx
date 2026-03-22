import React, { useState, useEffect } from "react";
import { fundamentalService, FundamentalData } from "../services/fundamentalService";
import { Ticker } from "../types";
import { Badge } from "./UI";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Activity, Info, BarChart3, PieChart } from "lucide-react";
import { motion } from "motion/react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart as RePieChart, Pie, Cell } from "recharts";

interface FundamentalAnalysisProps {
  ticker: Ticker;
}

export const FundamentalAnalysis: React.FC<FundamentalAnalysisProps> = ({ ticker }) => {
  const [data, setData] = useState<FundamentalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeChart, setActiveChart] = useState<"revenue" | "opm" | "netProfit">("revenue");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const result = await fundamentalService.getFundamentalData(ticker.symbol, ticker.exchange || "NSE");
        setData(result);
      } catch (err) {
        setError("Failed to load fundamental data");
      }
      setLoading(false);
    };
    fetchData();
  }, [ticker]);

  if (loading) {
    return (
      <div className="space-y-6 py-4">
        <div className="h-32 bg-white/5 rounded-3xl animate-pulse" />
        <div className="h-64 bg-white/5 rounded-3xl animate-pulse" />
        <div className="h-40 bg-white/5 rounded-3xl animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center text-white/40 glass rounded-3xl">
        <AlertTriangle className="mx-auto mb-2 opacity-50" />
        <p>{error || "No data available"}</p>
      </div>
    );
  }

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#6366F1'];
  const holdingData = [
    { name: 'Promoter', value: data.charts.holding.promoter },
    { name: 'FII', value: data.charts.holding.fii },
    { name: 'DII', value: data.charts.holding.dii },
    { name: 'Public', value: data.charts.holding.public },
  ];

  return (
    <div className="space-y-6" id="fundamental-analysis-container">
      {/* RATING & METRICS */}
      <div id="overview" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass p-5 rounded-3xl flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-[40px] -mr-16 -mt-16" />
          <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-2">AI Rating</div>
          <div className={`text-4xl font-bold font-mono mb-1 ${
            data.rating.recommendation === 'BUY' ? 'text-bull' : 
            data.rating.recommendation === 'SELL' ? 'text-bear' : 'text-amber-500'
          }`}>
            {data.rating.recommendation}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge type={data.rating.score > 70 ? 'success' : data.rating.score < 40 ? 'danger' : 'warning'}>
              Score: {data.rating.score}/100
            </Badge>
          </div>
          <div className="mt-4 text-sm font-medium text-white/60">
            Target: <span className="text-white font-mono">₹{data.rating.targetPrice}</span>
            <span className={`ml-2 text-xs ${data.rating.upside >= 0 ? 'text-bull' : 'text-bear'}`}>
              ({data.rating.upside > 0 ? '+' : ''}{data.rating.upside}%)
            </span>
          </div>
        </div>

        <div className="sm:col-span-2 glass p-5 rounded-3xl">
          <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-4">Key Metrics</div>
          <div className="grid grid-cols-3 gap-y-4 gap-x-2">
            {[
              { l: "CMP", v: `₹${data.metrics.cmp}` },
              { l: "Market Cap", v: data.metrics.marketCap },
              { l: "P/E", v: data.metrics.pe },
              { l: "P/B", v: data.metrics.pb },
              { l: "ROE", v: `${data.metrics.roe}%` },
              { l: "D/E", v: data.metrics.de },
              { l: "Div Yield", v: `${data.metrics.dividendYield}%` },
              { l: "Volume", v: data.metrics.volume },
              { l: "52W Range", v: data.metrics.week52Range },
            ].map((m, i) => (
              <div key={i}>
                <div className="text-[9px] text-white/30 font-medium uppercase tracking-wider mb-1">{m.l}</div>
                <div className="text-xs sm:text-sm font-bold font-mono">{m.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CHARTS */}
      <div id="pl-analysis" className="glass p-5 rounded-3xl">
        <div className="flex items-center justify-between mb-6">
          <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Financial Trends (5Y)</div>
          <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
            {(["revenue", "opm", "netProfit"] as const).map(c => (
              <button
                key={c}
                onClick={() => setActiveChart(c)}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${
                  activeChart === c ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
                }`}
              >
                {c.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.charts[activeChart]}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="period" hide />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#151619', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                itemStyle={{ color: '#fff', fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* PROS & CONS */}
      <div id="swot" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass p-5 rounded-3xl border border-bull/20 bg-bull/5">
          <div className="flex items-center gap-2 mb-4 text-bull">
            <CheckCircle size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Strengths</span>
          </div>
          <ul className="space-y-3">
            {data.pros.map((p, i) => (
              <li key={i} className="text-sm text-white/80 flex items-start gap-2">
                <span className="text-bull mt-1">•</span> {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="glass p-5 rounded-3xl border border-bear/20 bg-bear/5">
          <div className="flex items-center gap-2 mb-4 text-bear">
            <AlertTriangle size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Weaknesses</span>
          </div>
          <ul className="space-y-3">
            {data.cons.map((c, i) => (
              <li key={i} className="text-sm text-white/80 flex items-start gap-2">
                <span className="text-bear mt-1">•</span> {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* DRIVERS & RISKS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass p-5 rounded-3xl">
          <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-4">Upgrade Drivers</div>
          <div className="space-y-3">
            {data.upgradeDrivers.map((d, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                <span className="text-xs font-medium text-white/80">{d.metric}</span>
                <Badge type={d.status ? 'success' : 'neutral'} xs>{d.status ? 'ACTIVE' : 'INACTIVE'}</Badge>
              </div>
            ))}
          </div>
        </div>
        <div className="glass p-5 rounded-3xl">
          <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-4">Downgrade Risks</div>
          <div className="space-y-3">
            {data.downgradeRisks.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                <span className="text-xs font-medium text-white/80">{r.risk}</span>
                <Badge type={r.status ? 'danger' : 'neutral'} xs>{r.status ? 'ACTIVE' : 'INACTIVE'}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HOLDING PATTERN */}
      <div id="shareholders" className="glass p-5 rounded-3xl">
        <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-6">Holding Pattern</div>
        <div className="flex flex-col sm:flex-row items-center gap-8">
          <div className="w-48 h-48 relative">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={holdingData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  isAnimationActive={false}
                >
                  {holdingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#151619', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                  formatter={(value: number) => `${value}%`}
                />
              </RePieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-2xl font-bold font-mono">{data.charts.holding.promoter}%</span>
              <span className="text-[9px] text-white/40 uppercase tracking-widest">Promoter</span>
            </div>
          </div>
          
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(['promoter', 'fii', 'dii'] as const).map((type, i) => {
              const info = data.holdingAnalysis[type];
              return (
                <div key={type} className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-xs font-bold uppercase tracking-widest">{type}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold font-mono">{data.charts.holding[type]}%</span>
                    <div className={`flex items-center gap-1 text-xs font-bold ${
                      info.trend === 'UP' ? 'text-bull' : info.trend === 'DOWN' ? 'text-bear' : 'text-white/40'
                    }`}>
                      {info.trend === 'UP' ? <TrendingUp size={12} /> : info.trend === 'DOWN' ? <TrendingDown size={12} /> : <Activity size={12} />}
                      {info.qoqChange > 0 ? '+' : ''}{info.qoqChange}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* NEWS */}
      <div id="news" className="glass p-5 rounded-3xl">
        <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-4">Latest News</div>
        <div className="space-y-4">
          {data.news.map((n, i) => (
            <div key={i} className="group cursor-pointer">
              <div className="flex items-start justify-between gap-4">
                <h4 className="text-sm font-medium text-white/90 group-hover:text-accent transition-colors line-clamp-2">{n.title}</h4>
                <span className="text-[10px] text-white/30 whitespace-nowrap">{n.date}</span>
              </div>
              <div className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">{n.source}</div>
              {i < data.news.length - 1 && <div className="h-px w-full bg-white/5 mt-4" />}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

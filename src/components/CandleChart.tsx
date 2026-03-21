import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { OHLCData, AnalysisResult } from "../types";

interface CandleChartProps {
  data: OHLCData[];
  analysis: AnalysisResult | null;
  color: string;
  height?: number;
}

export function CandleChart({ data, analysis, color, height = 195 }: CandleChartProps) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; d: OHLCData } | null>(null);
  const [dims, setDims] = useState({ w: 360 });

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(e => {
      for (const x of e) setDims({ w: x.contentRect.width });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const vis = useMemo(() => data.slice(-80), [data]);
  const pad = useMemo(() => ({ t: 12, b: 24, l: 4, r: 52 }), []);
  const cW = useMemo(() => Math.max(2, (dims.w - pad.l - pad.r) / vis.length - 1), [dims.w, vis.length, pad]);
  const maxP = useMemo(() => Math.max(...vis.map(d => d.high)), [vis]);
  const minP = useMemo(() => Math.min(...vis.map(d => d.low)), [vis]);
  const range = useMemo(() => (maxP - minP) * 1.1 || 1, [maxP, minP]);
  const yS = useCallback((p: number) => pad.t + ((maxP + (range * 0.05) - p) / range) * (height - pad.t - pad.b), [maxP, range, height, pad]);
  const xP = useCallback((i: number) => pad.l + i * (cW + 1) + cW / 2, [pad.l, cW]);

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv || !data || data.length < 2) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W = dims.w;
    const H = height;
    cv.width = W * dpr;
    cv.height = H * dpr;
    cv.style.width = W + "px";
    cv.style.height = H + "px";
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.02)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = pad.t + ((H - pad.t - pad.b) / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(W - pad.r, y);
      ctx.stroke();
    }
    
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "bold 9px 'JetBrains Mono'";
    ctx.textAlign = "right";
    for (let i = 0; i < 5; i++) {
      const p = (maxP + (range * 0.05)) - (range / 4) * i;
      ctx.fillText(p.toFixed(2), W - 4, yS(p) + 3);
    }

    // Volume (Subtle)
    const maxVol = Math.max(...vis.map(d => d.volume || 0)) || 1;
    vis.forEach((d, i) => {
      const x = pad.l + i * (cW + 1);
      const h = ((d.volume || 0) / maxVol) * 30;
      ctx.fillStyle = d.close >= d.open ? "rgba(16,185,129,0.05)" : "rgba(239,68,68,0.05)";
      ctx.fillRect(x, H - pad.b - h, cW, h);
    });

    // MA overlays
    const drawLine = (vals: (number | null)[], clr: string, w = 1.5) => {
      const off = data.length - vis.length;
      ctx.beginPath();
      ctx.strokeStyle = clr;
      ctx.lineWidth = w;
      ctx.lineJoin = "round";
      let st = false;
      vis.forEach((_, i) => {
        const v = vals[off + i];
        if (v == null) return;
        const x = xP(i), y = yS(v);
        if (!st) { ctx.moveTo(x, y); st = true; }
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };
    if (analysis?.ind) {
      drawLine(analysis.ind.sma20, "rgba(245,158,11,0.5)", 1.5);
      drawLine(analysis.ind.sma50, "rgba(59,130,246,0.5)", 1.5);
    }

    // Candles
    vis.forEach((d, i) => {
      const x = pad.l + i * (cW + 1);
      const isUp = d.close >= d.open;
      const bT = yS(Math.max(d.open, d.close));
      const bB = yS(Math.min(d.open, d.close));
      const bH = Math.max(1, bB - bT);
      const cx = x + cW / 2;
      const bull = "#10B981";
      const bear = "#EF4444";
      
      ctx.strokeStyle = isUp ? bull : bear;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, yS(d.high));
      ctx.lineTo(cx, yS(d.low));
      ctx.stroke();
      
      ctx.fillStyle = isUp ? bull : bear;
      if (cW > 3) {
        ctx.beginPath();
        ctx.roundRect(x, bT, cW, bH, 1);
        ctx.fill();
      } else {
        ctx.fillRect(cx - 0.5, bT, 1, bH);
      }
    });

    // Current price line
    const last = vis[vis.length - 1];
    const curY = yS(last.close);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = (last.close >= last.open ? "#10B981" : "#EF4444") + "44";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, curY);
    ctx.lineTo(W - pad.r, curY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Price Label
    ctx.fillStyle = last.close >= last.open ? "#10B981" : "#EF4444";
    ctx.beginPath();
    ctx.roundRect(W - pad.r + 2, curY - 8, pad.r - 4, 16, 4);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.font = "bold 9px 'JetBrains Mono'";
    ctx.textAlign = "center";
    ctx.fillText(last.close.toFixed(2), W - pad.r/2, curY + 3);

    // Crosshair
    if (tip) {
      ctx.setLineDash([2, 2]);
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tip.x, pad.t);
      ctx.lineTo(tip.x, H - pad.b);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pad.l, tip.y);
      ctx.lineTo(W - pad.r, tip.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [data, dims, analysis, color, height, tip]);

    const onMove = useCallback((e: any) => {
      if (!data || !boxRef.current) return;
      const rect = boxRef.current.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const vis = data.slice(-80);
      const cW = Math.max(2, (dims.w - 56) / vis.length - 1);
      const idx = Math.floor((x - 4) / (cW + 1));
      if (idx >= 0 && idx < vis.length) setTip({ x, y, d: vis[idx] });
    }, [data, dims.w]);

  return (
    <div
      ref={boxRef}
      className="relative w-full touch-none cursor-crosshair"
      onTouchMove={onMove}
      onMouseMove={onMove}
      onTouchEnd={() => setTip(null)}
      onMouseLeave={() => setTip(null)}
    >
      <canvas ref={cvRef} className="block w-full" style={{ height }} />
      {tip && (
        <div
          className="absolute top-4 left-4 z-10 pointer-events-none p-4 rounded-2xl glass shadow-2xl text-[10px] font-mono text-white/90 space-y-1 min-w-[140px]"
        >
          <div className="text-white/30 font-bold tracking-widest mb-2 border-b border-white/5 pb-1">
            {new Date(tip.d.time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="flex justify-between"><span>OPEN</span> <b className="text-white">{tip.d.open?.toFixed(2)}</b></div>
          <div className="flex justify-between"><span>HIGH</span> <b className="text-bull">{tip.d.high?.toFixed(2)}</b></div>
          <div className="flex justify-between"><span>LOW</span> <b className="text-bear">{tip.d.low?.toFixed(2)}</b></div>
          <div className="flex justify-between"><span>CLOSE</span> <b className="text-white">{tip.d.close?.toFixed(2)}</b></div>
          <div className="flex justify-between pt-1 border-t border-white/5 mt-1">
            <span className="text-white/30">VOL</span> 
            <b className="text-white/60">{(tip.d.volume || 0) > 1e6 ? ((tip.d.volume / 1e6).toFixed(2) + "M") : ((tip.d.volume / 1e3).toFixed(2) + "K")}</b>
          </div>
        </div>
      )}
    </div>
  );
}

import * as React from "react";

interface GaugeProps {
  value: number;
  label: string;
  zones?: { from: number; to: number; color: string }[];
}

export function Gauge({ value, label, zones }: GaugeProps) {
  const pct = Math.min(100, Math.max(0, value || 0));
  let c = "#F59E0B";
  if (zones) {
    for (const z of zones) {
      if (value >= z.from && value <= z.to) {
        c = z.color;
        break;
      }
    }
  }
  return (
    <div className="text-center group">
      <div className="relative w-[60px] h-[60px] mx-auto mb-2">
        <svg viewBox="0 0 50 50" className="w-full h-full">
          <circle cx="25" cy="25" r="21" fill="none" className="stroke-white/5" strokeWidth="4" />
          <circle
            cx="25"
            cy="25"
            r="21"
            fill="none"
            stroke={c}
            strokeWidth="4"
            strokeDasharray={`${(pct / 100) * 132} 132`}
            strokeLinecap="round"
            transform="rotate(-90 25 25)"
            className="transition-[stroke-dasharray] duration-1000 ease-out"
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center text-[13px] font-bold font-mono"
          style={{ color: c }}
        >
          {value?.toFixed(0)}
        </div>
      </div>
      <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest">{label}</div>
    </div>
  );
}

interface BadgeProps {
  type: "bullish" | "bearish" | "neutral" | "info";
  children: React.ReactNode;
  xs?: boolean;
}

export function Badge({ type, children, xs }: BadgeProps) {
  const cs = {
    bullish: { bg: "bg-bull/10", bd: "border-bull/20", tx: "text-bull" },
    bearish: { bg: "bg-bear/10", bd: "border-bear/20", tx: "text-bear" },
    neutral: { bg: "bg-amber-500/10", bd: "border-amber-500/20", tx: "text-amber-400" },
    info: { bg: "bg-accent/10", bd: "border-accent/20", tx: "text-accent" },
  };
  const c = cs[type] || cs.neutral;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold tracking-wider uppercase font-mono border ${
        xs ? "px-1.5 py-0.5 text-[8px]" : "px-2.5 py-1 text-[10px]"
      } ${c.bg} ${c.bd} ${c.tx}`}
    >
      {children}
    </span>
  );
}

export const Dot = ({ on }: { on: boolean }) => (
  <div
    className={`w-2 h-2 rounded-full ${on ? "bg-bull shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-bear shadow-[0_0_8px_rgba(239,68,68,0.5)]"}`}
  />
);

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
        {/* Outer Ring */}
        <circle cx="50" cy="50" r="45" fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.1" />
        
        {/* Guiding Compass/Arrow */}
        <path 
          d="M50 15 L65 50 L50 85 L35 50 Z" 
          fill="url(#logo-grad)" 
          className="animate-pulse"
        />
        
        {/* Stylized 'S' for Saarthi */}
        <path 
          d="M40 40 Q50 30 60 40 T40 60 Q30 70 40 80" 
          fill="none" 
          stroke="white" 
          strokeWidth="6" 
          strokeLinecap="round"
          strokeOpacity="0.8"
          className="drop-shadow-sm"
        />

        <defs>
          <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Center Glow */}
      <div className="absolute inset-0 bg-accent/20 rounded-full blur-xl -z-10" />
    </div>
  );
}

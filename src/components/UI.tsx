import * as React from "react";

import { motion, AnimatePresence } from "motion/react";

interface GaugeProps {
  value: number;
  label: string;
  zones?: { from: number; to: number; color: string }[];
}

export const Gauge = React.memo(({ value, label, zones }: GaugeProps) => {
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
      <div className="relative w-[50px] h-[50px] sm:w-[60px] sm:h-[60px] mx-auto mb-1.5 sm:mb-2">
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
          className="absolute inset-0 flex items-center justify-center text-[11px] sm:text-[13px] font-bold font-mono"
          style={{ color: c }}
        >
          {value?.toFixed(1)}
        </div>
      </div>
      <div className="text-[8px] sm:text-[10px] text-white/30 uppercase font-bold tracking-widest">{label}</div>
    </div>
  );
});

interface BadgeProps {
  type: "bullish" | "bearish" | "neutral" | "info";
  children: React.ReactNode;
  xs?: boolean;
}

export const Badge = React.memo(({ type, children, xs }: BadgeProps) => {
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
        xs ? "px-1.5 py-0.5 text-[7px] sm:text-[8px]" : "px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[10px]"
      } ${c.bg} ${c.bd} ${c.tx}`}
    >
      {children}
    </span>
  );
});

export const Dot = ({ on }: { on: boolean }) => (
  <div
    className={`w-2 h-2 rounded-full ${on ? "bg-bull shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-bear shadow-[0_0_8px_rgba(239,68,68,0.5)]"}`}
  />
);

const SAARTHI_LANGS = [
  { text: "Saarthi", lang: "English" },
  { text: "सारथी", lang: "Hindi" },
  { text: "சாரதி", lang: "Tamil" },
  { text: "ಸಾರಥಿ", lang: "Kannada" },
  { text: "సారథి", lang: "Telugu" },
  { text: "સાર્થિ", lang: "Gujarati" },
  { text: "ਸਾਰਥੀ", lang: "Punjabi" },
  { text: "সারথি", lang: "Bengali" },
  { text: "സാരഥി", lang: "Malayalam" },
  { text: "सारथी", lang: "Marathi" },
];

export function SaarthiAnimator() {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % SAARTHI_LANGS.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="inline-block min-w-[80px]">
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="inline-block text-accent"
        >
          {SAARTHI_LANGS[index].text}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

export const Logo = React.memo(({ size = 40 }: { size?: number }) => {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="chart-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Chart Path */}
        <motion.path
          d="M 10 80 Q 30 20 50 60 T 90 10"
          fill="none"
          stroke="#10B981"
          strokeWidth="4"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          filter="url(#glow)"
        />

        {/* Area Fill */}
        <motion.path
          d="M 10 80 Q 30 20 50 60 T 90 10 V 90 H 10 Z"
          fill="url(#chart-grad)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
        />

        {/* Guiding Dot */}
        <motion.circle
          r="4"
          fill="#10B981"
          filter="url(#glow)"
          animate={{
            offsetDistance: ["0%", "100%"]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
          }}
          style={{
            offsetPath: "path('M 10 80 Q 30 20 50 60 T 90 10')",
          }}
        />

        {/* Grid Lines (Subtle) */}
        <line x1="10" y1="90" x2="90" y2="90" stroke="white" strokeOpacity="0.1" strokeWidth="1" />
        <line x1="10" y1="10" x2="10" y2="90" stroke="white" strokeOpacity="0.1" strokeWidth="1" />
      </svg>
      
      {/* Background Glow */}
      <div className="absolute inset-0 bg-bull/10 rounded-full blur-xl -z-10" />
    </div>
  );
});

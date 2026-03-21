export interface OHLCData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Ticker {
  symbol: string;
  name: string;
  exchange: string;
  id: string;
  _sid?: string;
  _seg?: string;
}

export interface AnalysisResult {
  price: {
    current: number;
    change: number;
    changePct: string;
    high: number;
    low: number;
    open: number;
    volume: number;
  };
  verdict: {
    label: string;
    color: string;
    bullPct: number;
    bearPct: number;
  };
  classic: {
    rsi: number;
    macd: { value: number; signal: number; histogram: number };
    bb: { upper: number; middle: number; lower: number };
    atr: number;
    vwap: number;
    stoch: { k: number; d: number };
    sma: { s20: number; s50: number; s200: number };
    ema: { e9: number; e21: number };
    adx: { adx: number; diP: number; diN: number; trend: string };
  };
  smc: {
    orderBlocks: OrderBlock[];
    fvg: FVG[];
    structure: Structure;
    liquidity: LiquidityZone[];
  };
  vp: { profile: VolumeProfileBin[]; poc: number };
  sr: SRLevel[];
  patterns: Pattern[];
  raw: OHLCData[];
  ind: any;
}

export interface OrderBlock {
  type: "bullish" | "bearish";
  index: number;
  high: number;
  low: number;
  time: number;
  strength: number;
  mit: boolean;
}

export interface FVG {
  type: "bullish" | "bearish";
  top: number;
  bottom: number;
  index: number;
  time: number;
  filled: boolean;
}

export interface Structure {
  swings: any[];
  events: any[];
  trend: string | null;
}

export interface LiquidityZone {
  type: "buyside" | "sellside";
  price: number;
  touches: number;
}

export interface VolumeProfileBin {
  from: number;
  to: number;
  vol: number;
  pct: number;
}

export interface SRLevel {
  type: "resistance" | "support";
  price: number;
  index: number;
  touches: number;
}

export interface Pattern {
  name: string;
  type: "bullish" | "bearish" | "neutral";
  sig: "high" | "very_high";
}

import { OHLCData } from "../types";

export const TA = {
  sma: (d: OHLCData[], p: number) => {
    const r = [];
    for (let i = 0; i < d.length; i++) {
      if (i < p - 1) { r.push(null); continue; }
      let s = 0;
      for (let j = i - p + 1; j <= i; j++) s += d[j].close;
      r.push(s / p);
    }
    return r;
  },
  ema: (d: OHLCData[], p: number) => {
    const r = [], k = 2 / (p + 1);
    let e = d.slice(0, p).reduce((s, x) => s + x.close, 0) / p;
    for (let i = 0; i < d.length; i++) {
      if (i < p - 1) { r.push(null); continue; }
      if (i === p - 1) { r.push(e); continue; }
      e = d[i].close * k + e * (1 - k);
      r.push(e);
    }
    return r;
  },
  rsi: (d: OHLCData[], p = 14) => {
    const r = [];
    let aG = 0, aL = 0;
    for (let i = 0; i < d.length; i++) {
      if (i === 0) { r.push(null); continue; }
      const ch = d[i].close - d[i - 1].close, g = ch > 0 ? ch : 0, l = ch < 0 ? -ch : 0;
      if (i < p) { aG += g; aL += l; r.push(null); continue; }
      if (i === p) { aG = (aG + g) / p; aL = (aL + l) / p; }
      else { aG = (aG * (p - 1) + g) / p; aL = (aL * (p - 1) + l) / p; }
      r.push(aL === 0 ? 100 : 100 - 100 / (1 + aG / aL));
    }
    return r;
  },
  macd: (d: OHLCData[], f = 12, s = 26, sg = 9) => {
    const eF = TA.ema(d, f), eS = TA.ema(d, s), ml = eF.map((v, i) => v != null && eS[i] != null ? v - eS[i] : null), sd = [], k = 2 / (sg + 1);
    let ev = null, cnt = 0;
    for (let i = 0; i < ml.length; i++) {
      if (ml[i] == null) { sd.push(null); continue; }
      if (ev == null) {
        cnt++;
        if (cnt < sg) { sd.push(null); continue; }
        let sm = 0, c = 0;
        for (let j = i; j >= 0 && c < sg; j--) { if (ml[j] != null) { sm += ml[j]; c++; } }
        ev = sm / sg;
      } else { ev = ml[i] * k + ev * (1 - k); }
      sd.push(ev);
    }
    return { macdLine: ml, signalLine: sd, histogram: ml.map((v, i) => v != null && sd[i] != null ? v - sd[i] : null) };
  },
  bb: (d: OHLCData[], p = 20, sd = 2) => {
    const sma = TA.sma(d, p);
    return sma.map((a, i) => {
      if (a == null) return { upper: null, middle: null, lower: null };
      let v = 0;
      for (let j = i - p + 1; j <= i; j++) v += Math.pow(d[j].close - a, 2);
      const s = Math.sqrt(v / p);
      return { upper: a + sd * s, middle: a, lower: a - sd * s };
    });
  },
  atr: (d: OHLCData[], p = 14) => {
    const r = [];
    for (let i = 0; i < d.length; i++) {
      if (i === 0) { r.push(d[i].high - d[i].low); continue; }
      const tr = Math.max(d[i].high - d[i].low, Math.abs(d[i].high - d[i - 1].close), Math.abs(d[i].low - d[i - 1].close));
      if (i < p) { r.push(tr); continue; }
      r.push(((r[i - 1] || tr) * (p - 1) + tr) / p);
    }
    return r;
  },
  vwap: (d: OHLCData[]) => {
    let cv = 0, ct = 0;
    return d.map(x => {
      const tp = (x.high + x.low + x.close) / 3;
      cv += x.volume || 1;
      ct += tp * (x.volume || 1);
      return ct / cv;
    });
  },
  stoch: (d: OHLCData[], kP = 14, dP = 3) => {
    const kV = [];
    for (let i = 0; i < d.length; i++) {
      if (i < kP - 1) { kV.push(null); continue; }
      let h = -Infinity, l = Infinity;
      for (let j = i - kP + 1; j <= i; j++) { h = Math.max(h, d[j].high); l = Math.min(l, d[j].low); }
      kV.push(h === l ? 50 : ((d[i].close - l) / (h - l)) * 100);
    }
    const dV = kV.map((_, i) => {
      if (i < kP - 1 + dP - 1) return null;
      let s = 0;
      for (let j = i - dP + 1; j <= i; j++) s += kV[j] || 0;
      return s / dP;
    });
    return { k: kV, d: dV };
  },
  adx: (d: OHLCData[], p = 14) => {
    if (d.length < p * 2 + 1) return { adx: null, diP: null, diN: null, trend: "weak" };
    const tr = [], dmP = [], dmN = [];
    for (let i = 1; i < d.length; i++) {
      tr.push(Math.max(d[i].high - d[i].low, Math.abs(d[i].high - d[i - 1].close), Math.abs(d[i].low - d[i - 1].close)));
      const up = d[i].high - d[i - 1].high, dn = d[i - 1].low - d[i].low;
      dmP.push(up > dn && up > 0 ? up : 0); dmN.push(dn > up && dn > 0 ? dn : 0);
    }
    const sm = (a: number[]) => {
      let s = a.slice(0, p).reduce((x, y) => x + y, 0);
      const r = [s];
      for (let i = p; i < a.length; i++) { s = s - s / p + a[i]; r.push(s); }
      return r;
    };
    const sTR = sm(tr), sDMP = sm(dmP), sDMN = sm(dmN);
    const diP = sTR.map((v, i) => (sDMP[i] / v) * 100), diN = sTR.map((v, i) => (sDMN[i] / v) * 100);
    const dx = diP.map((v, i) => Math.abs(v - diN[i]) / (v + diN[i]) * 100);
    let av = dx.slice(0, p).reduce((a, b) => a + b, 0) / p;
    for (let i = p; i < dx.length; i++) av = (av * (p - 1) + dx[i]) / p;
    return { adx: av, diP: diP[diP.length - 1], diN: diN[diN.length - 1], trend: av > 25 ? "strong" : "weak" };
  },
  orderBlocks: (d: OHLCData[], th = 1.5) => {
    const atr = TA.atr(d, 14), bl = [];
    for (let i = 2; i < d.length; i++) {
      const mv = Math.abs(d[i].close - d[i - 1].close);
      if (mv < (atr[i] || 1) * th) continue;
      if (d[i].close > d[i - 1].close && d[i - 1].close < d[i - 1].open) bl.push({ type: "bullish" as const, index: i - 1, high: d[i - 1].open, low: d[i - 1].low, time: d[i - 1].time, strength: mv / (atr[i] || 1), mit: false });
      if (d[i].close < d[i - 1].close && d[i - 1].close > d[i - 1].open) bl.push({ type: "bearish" as const, index: i - 1, high: d[i - 1].high, low: d[i - 1].open, time: d[i - 1].time, strength: mv / (atr[i] || 1), mit: false });
    }
    for (const ob of bl) {
      for (let j = ob.index + 2; j < d.length; j++) {
        if (ob.type === "bullish" && d[j].low <= ob.low) { ob.mit = true; break; }
        if (ob.type === "bearish" && d[j].high >= ob.high) { ob.mit = true; break; }
      }
    }
    return bl.filter(b => !b.mit).slice(-8);
  },
  fvg: (d: OHLCData[]) => {
    const g = [];
    for (let i = 2; i < d.length; i++) {
      if (d[i].low > d[i - 2].high) g.push({ type: "bullish" as const, top: d[i].low, bottom: d[i - 2].high, index: i - 1, time: d[i - 1].time, filled: false });
      if (d[i].high < d[i - 2].low) g.push({ type: "bearish" as const, top: d[i - 2].low, bottom: d[i].high, index: i - 1, time: d[i - 1].time, filled: false });
    }
    for (const f of g) {
      for (let j = f.index + 2; j < d.length; j++) {
        if (f.type === "bullish" && d[j].low <= f.bottom) { f.filled = true; break; }
        if (f.type === "bearish" && d[j].high >= f.top) { f.filled = true; break; }
      }
    }
    return g.filter(x => !x.filled).slice(-8);
  },
  structure: (d: OHLCData[], lb = 5) => {
    const sw = [];
    for (let i = lb; i < d.length - lb; i++) {
      let isH = true, isL = true;
      for (let j = i - lb; j <= i + lb; j++) {
        if (j === i) continue;
        if (d[j].high >= d[i].high) isH = false;
        if (d[j].low <= d[i].low) isL = false;
      }
      if (isH) sw.push({ type: "high", price: d[i].high, index: i, time: d[i].time });
      if (isL) sw.push({ type: "low", price: d[i].low, index: i, time: d[i].time });
    }
    const ev = [];
    let tr = null, lHH = null, lLL = null;
    for (const s of sw) {
      if (s.type === "high") {
        if (lHH != null && s.price > lHH) {
          ev.push({ type: tr === "bearish" ? "CHoCH" : "BOS", dir: "bullish", price: s.price, index: s.index, time: s.time });
          tr = "bullish";
        }
        lHH = s.price;
      }
      if (s.type === "low") {
        if (lLL != null && s.price < lLL) {
          ev.push({ type: tr === "bullish" ? "CHoCH" : "BOS", dir: "bearish", price: s.price, index: s.index, time: s.time });
          tr = "bearish";
        }
        lLL = s.price;
      }
    }
    return { swings: sw, events: ev.slice(-8), trend: tr };
  },
  liqZones: (d: OHLCData[], tol = 0.002) => {
    const z = [];
    for (let i = 0; i < d.length; i++) {
      let hC = 0, lC = 0;
      for (let j = i + 1; j < d.length; j++) {
        if (Math.abs(d[j].high - d[i].high) / d[i].high < tol) hC++;
        if (Math.abs(d[j].low - d[i].low) / d[i].low < tol) lC++;
      }
      if (hC >= 2) z.push({ type: "buyside" as const, price: d[i].high, touches: hC + 1 });
      if (lC >= 2) z.push({ type: "sellside" as const, price: d[i].low, touches: lC + 1 });
    }
    const u: any[] = [];
    for (const x of z) { if (!u.some(y => y.type === x.type && Math.abs(y.price - x.price) / x.price < tol * 2)) u.push(x); }
    return u.sort((a, b) => b.touches - a.touches).slice(0, 6);
  },
  sr: (d: OHLCData[], lb = 10) => {
    const lv = [];
    for (let i = lb; i < d.length - lb; i++) {
      let isR = true, isS = true;
      for (let j = i - lb; j <= i + lb; j++) {
        if (j === i) continue;
        if (d[j].high >= d[i].high) isR = false;
        if (d[j].low <= d[i].low) isS = false;
      }
      if (isR) lv.push({ type: "resistance" as const, price: d[i].high, index: i });
      if (isS) lv.push({ type: "support" as const, price: d[i].low, index: i });
    }
    const cl: any[] = [];
    const t = d[d.length - 1].close * 0.01;
    for (const l of lv) {
      const ex = cl.find(c => c.type === l.type && Math.abs(c.price - l.price) < t);
      if (ex) { ex.touches++; ex.price = (ex.price + l.price) / 2; }
      else cl.push({ ...l, touches: 1 });
    }
    return cl.sort((a, b) => b.touches - a.touches).slice(0, 8);
  },
  volProfile: (d: OHLCData[], bins = 24) => {
    const pr = d.map(x => x.close), mn = Math.min(...pr), mx = Math.max(...pr), step = (mx - mn) / bins || 1;
    const pf = Array.from({ length: bins }, (_, i) => ({ from: mn + step * i, to: mn + step * (i + 1), vol: 0, pct: 0 }));
    for (const x of d) {
      const idx = Math.min(Math.floor((x.close - mn) / step), bins - 1);
      if (idx >= 0) pf[idx].vol += x.volume || 1;
    }
    const maxV = Math.max(...pf.map(p => p.vol));
    pf.forEach(p => p.pct = p.vol / maxV);
    const poc = pf.reduce((a, b) => b.vol > a.vol ? b : a);
    return { profile: pf, poc: (poc.from + poc.to) / 2 };
  },
  patterns: (d: OHLCData[]) => {
    const pats = [], len = d.length;
    if (len < 3) return pats;
    const bs = (c: OHLCData) => Math.abs(c.close - c.open), isB = (c: OHLCData) => c.close > c.open, isE = (c: OHLCData) => c.close < c.open, uw = (c: OHLCData) => c.high - Math.max(c.open, c.close), lw = (c: OHLCData) => Math.min(c.open, c.close) - c.low;
    const avgB = d.slice(-20).reduce((s, c) => s + bs(c), 0) / Math.min(20, len);
    const L = d[len - 1];
    if (bs(L) < avgB * 0.1) pats.push({ name: "Doji", type: "neutral" as const, sig: "high" as const });
    if (lw(L) > bs(L) * 2 && uw(L) < bs(L) * 0.5) pats.push({ name: "Hammer", type: "bullish" as const, sig: "high" as const });
    if (uw(L) > bs(L) * 2 && lw(L) < bs(L) * 0.5) pats.push({ name: "Shooting Star", type: "bearish" as const, sig: "high" as const });
    if (len >= 2) {
      const P = d[len - 2];
      if (isE(P) && isB(L) && L.open < P.close && L.close > P.open && bs(L) > bs(P)) pats.push({ name: "Bullish Engulfing", type: "bullish" as const, sig: "very_high" as const });
      if (isB(P) && isE(L) && L.open > P.close && L.close < P.open && bs(L) > bs(P)) pats.push({ name: "Bearish Engulfing", type: "bearish" as const, sig: "very_high" as const });
    }
    if (len >= 3) {
      const [c1, c2, c3] = [d[len - 3], d[len - 2], d[len - 1]];
      if (isE(c1) && bs(c2) < avgB * 0.3 && isB(c3) && c3.close > (c1.open + c1.close) / 2) pats.push({ name: "Morning Star", type: "bullish" as const, sig: "very_high" as const });
      if (isB(c1) && bs(c2) < avgB * 0.3 && isE(c3) && c3.close < (c1.open + c1.close) / 2) pats.push({ name: "Evening Star", type: "bearish" as const, sig: "very_high" as const });
      if (isB(c1) && isB(c2) && isB(c3) && c2.close > c1.close && c3.close > c2.close) pats.push({ name: "Three White Soldiers", type: "bullish" as const, sig: "very_high" as const });
      if (isE(c1) && isE(c2) && isE(c3) && c2.close < c1.close && c3.close < c2.close) pats.push({ name: "Three Black Crows", type: "bearish" as const, sig: "very_high" as const });
    }
    return pats;
  },

  run: (d: OHLCData[]) => {
    if (!d || d.length < 30) return null;
    const close = d[d.length - 1].close, li = d.length - 1;
    const sma20 = TA.sma(d, 20), sma50 = TA.sma(d, 50), sma200 = TA.sma(d, 200);
    const ema9 = TA.ema(d, 9), ema21 = TA.ema(d, 21);
    const rsi = TA.rsi(d), macd = TA.macd(d), boll = TA.bb(d), atr = TA.atr(d), vwap = TA.vwap(d), stoch = TA.stoch(d), adx = TA.adx(d);
    const sr = TA.sr(d), ob = TA.orderBlocks(d), fvg = TA.fvg(d), struct = TA.structure(d), liq = TA.liqZones(d), vp = TA.volProfile(d), pats = TA.patterns(d);
    const cRSI = rsi[li], cMACD = macd.macdLine[li], cSig = macd.signalLine[li], cBB = boll[li], cATR = atr[li], cVWAP = vwap[li], cStK = stoch.k[li], cStD = stoch.d[li];
    const cS20 = sma20[li], cS50 = sma50[li], cS200 = sma200[li], cE9 = ema9[li], cE21 = ema21[li];

    let bull = 0, bear = 0;
    if (close > cS20) bull++; else bear++;
    if (close > cS50) bull++; else bear++;
    if (cS200 && close > cS200) bull += 2; else if (cS200) bear += 2;
    if (cE9 > cE21) bull++; else bear++;
    if (cRSI > 50 && cRSI < 70) bull++; if (cRSI < 50 && cRSI > 30) bear++;
    if (cRSI > 70) bear++; if (cRSI < 30) bull++;
    if (cMACD > cSig) bull++; else bear++;
    if (cStK > cStD) bull++; else bear++;
    if (cBB) { if (close < cBB.lower) bull++; if (close > cBB.upper) bear++; }
    if (close > cVWAP) bull++; else bear++;
    if (struct.trend === "bullish") bull += 2; else if (struct.trend === "bearish") bear += 2;
    if (adx.adx > 25) { if (adx.diP > adx.diN) bull++; else bear++; }
    for (const p of pats) { if (p.type === "bullish") bull += (p.sig === "very_high" ? 2 : 1); if (p.type === "bearish") bear += (p.sig === "very_high" ? 2 : 1); }

    const total = bull + bear || 1, bullPct = Math.round((bull / total) * 100), bearPct = 100 - bullPct;
    let verdict = "NEUTRAL", vc = "#F59E0B";
    if (bullPct >= 68) { verdict = "STRONG BUY"; vc = "#10B981"; }
    else if (bullPct >= 56) { verdict = "BUY"; vc = "#34D399"; }
    else if (bearPct >= 68) { verdict = "STRONG SELL"; vc = "#EF4444"; }
    else if (bearPct >= 56) { verdict = "SELL"; vc = "#F87171"; }

    const prev = d[li - 1].close, change = close - prev, changePct = ((change / prev) * 100).toFixed(2);

    return {
      price: { current: close, change, changePct, high: d[li].high, low: d[li].low, open: d[li].open, volume: d[li].volume },
      verdict: { label: verdict, color: vc, bullPct, bearPct },
      classic: { rsi: cRSI, macd: { value: cMACD, signal: cSig, histogram: macd.histogram[li] }, bb: cBB, atr: cATR, vwap: cVWAP, stoch: { k: cStK, d: cStD }, sma: { s20: cS20, s50: cS50, s200: cS200 }, ema: { e9: cE9, e21: cE21 }, adx },
      smc: { orderBlocks: ob, fvg, structure: struct, liquidity: liq },
      vp, sr, patterns: pats,
      raw: d, ind: { sma20, sma50, sma200, ema9, ema21, rsi, macd, bb: boll, atr, vwap, stoch },
    };
  },
};

export interface LCSocialData {
  name: string;
  symbol: string;
  galaxyScore: number | null;
  altRank: number | null;
  sentiment: number | null;
  socialDominance: number | null;
  interactions: number | null;
  postsActive: number | null;
  contributorsActive: number | null;
  percentChange24h: number | null;
  close: number | null;
}

export function toLC(symbol: string, cat: string): string {
  if (cat === "CRYPTO") {
    const base = symbol.replace(/(USDT|USDC|BUSD)$/, "");
    return `$${base}`;
  }
  if (cat === "US_EQUITY") return `$${symbol}`;
  if (cat === "INDIAN_EQUITY") return `$${symbol.replace(/\.(NS|BO)$/, "")}`;
  return symbol.replace(/=F$|=X$/, "").replace(/\^/, "");
}

export const lcService = {
  async getSocial(symbol: string, cat: string): Promise<LCSocialData | null> {
    try {
      const topic = toLC(symbol, cat);
      const r = await fetch(`/api/lunarcrush/topic/${encodeURIComponent(topic)}/v1`);
      if (!r.ok) return null;
      const d = await r.json();
      const data = d.data;
      if (!data) return null;
      return {
        name: data.name ?? symbol,
        symbol: data.symbol ?? symbol,
        galaxyScore: data.galaxy_score ?? null,
        altRank: data.alt_rank ?? null,
        sentiment: data.sentiment ?? null,
        socialDominance: data.social_dominance ?? null,
        interactions: data.interactions ?? null,
        postsActive: data.posts_active ?? null,
        contributorsActive: data.contributors_active ?? null,
        percentChange24h: data.percent_change_24h ?? null,
        close: data.close ?? null,
      };
    } catch {
      return null;
    }
  },
};

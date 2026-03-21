import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface TradeSuggestion {
  symbol: string;
  type: "BUY" | "SELL";
  entry: number;
  target: number;
  sl: number;
  reason: string;
}

export const geminiService = {
  getTradeSuggestions: async (category: string, data: any[]): Promise<TradeSuggestion[]> => {
    try {
      const marketContext = data.map(d => `${d.symbol}: Price ${d.price}, Change ${d.changePct.toFixed(2)}%`).join("; ");
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze the following ${category} market data and suggest 2 high-probability trades for a 15-minute timeframe. 
        Market Data: ${marketContext}.
        Provide the response in JSON format with fields: symbol, type (BUY/SELL), entry, target, sl, reason.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                symbol: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["BUY", "SELL"] },
                entry: { type: Type.NUMBER },
                target: { type: Type.NUMBER },
                sl: { type: Type.NUMBER },
                reason: { type: Type.STRING }
              },
              required: ["symbol", "type", "entry", "target", "sl", "reason"]
            }
          }
        }
      });

      return JSON.parse(response.text || "[]");
    } catch (e) {
      console.error("Gemini Error:", e);
      return [];
    }
  }
};

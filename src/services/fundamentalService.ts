import { GoogleGenAI, Type } from "@google/genai";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface FundamentalData {
  rating: {
    score: number;
    recommendation: "BUY" | "HOLD" | "SELL";
    targetPrice: number;
    upside: number;
  };
  metrics: {
    cmp: number;
    marketCap: string;
    pe: number;
    pb: number;
    roe: number;
    de: number;
    dividendYield: number;
    volume: string;
    week52Range: string;
  };
  charts: {
    revenue: { period: string; value: number }[];
    opm: { period: string; value: number }[];
    netProfit: { period: string; value: number }[];
    holding: { promoter: number; fii: number; dii: number; public: number };
  };
  pros: string[];
  cons: string[];
  upgradeDrivers: { metric: string; status: boolean }[];
  downgradeRisks: { risk: string; status: boolean }[];
  holdingAnalysis: {
    promoter: { trend: "UP" | "DOWN" | "FLAT"; qoqChange: number };
    fii: { trend: "UP" | "DOWN" | "FLAT"; qoqChange: number };
    dii: { trend: "UP" | "DOWN" | "FLAT"; qoqChange: number };
  };
  news: { title: string; date: string; source: string }[];
}

export const fundamentalService = {
  async getFundamentalData(symbol: string, exchange: string): Promise<FundamentalData> {
    const cacheKey = `${symbol}_${exchange}`.replace(/[^a-zA-Z0-9_]/g, "_");
    const docRef = doc(db, "fundamental_analysis", cacheKey);
    
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Cache for 24 hours
        if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
          return data.analysis as FundamentalData;
        }
      }
    } catch (err) {
      console.error("Error reading from cache:", err);
    }

    const today = new Date().toISOString().split('T')[0];
    const prompt = `Generate realistic fundamental analysis data for the stock ${symbol} listed on ${exchange}.
    Use the latest available data as of ${today}. Ensure the data is up-to-date and reflects the current fundamental profile of this stock.
    Provide the data in JSON format matching the schema.
    For charts, provide 5 years of quarterly data (20 data points) for revenue, opm (Operating Profit Margin %), and netProfit ending in the most recent quarter.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rating: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.NUMBER, description: "Score out of 100" },
                recommendation: { type: Type.STRING, enum: ["BUY", "HOLD", "SELL"] },
                targetPrice: { type: Type.NUMBER },
                upside: { type: Type.NUMBER, description: "Upside percentage" }
              },
              required: ["score", "recommendation", "targetPrice", "upside"]
            },
            metrics: {
              type: Type.OBJECT,
              properties: {
                cmp: { type: Type.NUMBER },
                marketCap: { type: Type.STRING },
                pe: { type: Type.NUMBER },
                pb: { type: Type.NUMBER },
                roe: { type: Type.NUMBER },
                de: { type: Type.NUMBER },
                dividendYield: { type: Type.NUMBER },
                volume: { type: Type.STRING },
                week52Range: { type: Type.STRING }
              },
              required: ["cmp", "marketCap", "pe", "pb", "roe", "de", "dividendYield", "volume", "week52Range"]
            },
            charts: {
              type: Type.OBJECT,
              properties: {
                revenue: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: { period: { type: Type.STRING }, value: { type: Type.NUMBER } },
                    required: ["period", "value"]
                  }
                },
                opm: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: { period: { type: Type.STRING }, value: { type: Type.NUMBER } },
                    required: ["period", "value"]
                  }
                },
                netProfit: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: { period: { type: Type.STRING }, value: { type: Type.NUMBER } },
                    required: ["period", "value"]
                  }
                },
                holding: {
                  type: Type.OBJECT,
                  properties: {
                    promoter: { type: Type.NUMBER },
                    fii: { type: Type.NUMBER },
                    dii: { type: Type.NUMBER },
                    public: { type: Type.NUMBER }
                  },
                  required: ["promoter", "fii", "dii", "public"]
                }
              },
              required: ["revenue", "opm", "netProfit", "holding"]
            },
            pros: { type: Type.ARRAY, items: { type: Type.STRING } },
            cons: { type: Type.ARRAY, items: { type: Type.STRING } },
            upgradeDrivers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { metric: { type: Type.STRING }, status: { type: Type.BOOLEAN } },
                required: ["metric", "status"]
              }
            },
            downgradeRisks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { risk: { type: Type.STRING }, status: { type: Type.BOOLEAN } },
                required: ["risk", "status"]
              }
            },
            holdingAnalysis: {
              type: Type.OBJECT,
              properties: {
                promoter: {
                  type: Type.OBJECT,
                  properties: { trend: { type: Type.STRING, enum: ["UP", "DOWN", "FLAT"] }, qoqChange: { type: Type.NUMBER } },
                  required: ["trend", "qoqChange"]
                },
                fii: {
                  type: Type.OBJECT,
                  properties: { trend: { type: Type.STRING, enum: ["UP", "DOWN", "FLAT"] }, qoqChange: { type: Type.NUMBER } },
                  required: ["trend", "qoqChange"]
                },
                dii: {
                  type: Type.OBJECT,
                  properties: { trend: { type: Type.STRING, enum: ["UP", "DOWN", "FLAT"] }, qoqChange: { type: Type.NUMBER } },
                  required: ["trend", "qoqChange"]
                }
              },
              required: ["promoter", "fii", "dii"]
            },
            news: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { title: { type: Type.STRING }, date: { type: Type.STRING }, source: { type: Type.STRING } },
                required: ["title", "date", "source"]
              }
            }
          },
          required: ["rating", "metrics", "charts", "pros", "cons", "upgradeDrivers", "downgradeRisks", "holdingAnalysis", "news"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    const parsedData = JSON.parse(text) as FundamentalData;
    
    try {
      await setDoc(docRef, {
        analysis: parsedData,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error("Error writing to cache:", err);
    }
    
    return parsedData;
  }
};

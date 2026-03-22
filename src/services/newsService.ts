import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY });

export interface MacroEvent {
  date: string;
  event: string;
  country: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
}

export interface CorporateAction {
  symbol: string;
  company: string;
  date: string;
  type: string;
  details: string;
}

export interface BSENews {
  NEWSID: string;
  SCRIP_CD: number;
  XML_NAME: string;
  NEWSSUB: string;
  DT_TM: string;
  NEWS_DT: string;
  CRITICALNEWS: number;
  ANNOUNCEMENT_TYPE: string;
  QUARTER_ID: number;
  FILESTATUS: string;
  ATTACHMENTNAME: string;
  MORE: string;
  HEADLINE: string;
  CATEGORYNAME: string;
  OLD: number;
  RN: number;
  PDFFLAG: number;
  NSURL: string;
  SLONGNAME: string;
  AGENDA_ID: number;
  TotalPageCnt: number;
  News_submission_dt: string;
  DissemDT: string;
  TimeDiff: string;
  Fld_Attachsize: number;
  SUBCATNAME: string;
  AUDIO_VIDEO_FILE: string;
}

export const newsService = {
  async getBSEAnnouncements(): Promise<BSENews[]> {
    try {
      const today = new Date();
      const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
      
      const res = await fetch(`/api/bse/announcements?pageno=1&strCat=Company+Update&strPrevDate=${dateStr}&strToDate=${dateStr}&strType=C&subcategory=-1`);
      if (!res.ok) throw new Error("Failed to fetch BSE news");
      const data = await res.json();
      return data.Table || [];
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  async getMacroEvents(): Promise<MacroEvent[]> {
    const prompt = `Generate a realistic list of 5 upcoming macroeconomic events for the next 7 days. Include events from US, India, and Global.
    Return JSON matching the schema.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING },
                event: { type: Type.STRING },
                country: { type: Type.STRING },
                impact: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW"] }
              },
              required: ["date", "event", "country", "impact"]
            }
          }
        }
      });
      return JSON.parse(response.text || "[]");
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  async getIndianCorporateActions(): Promise<CorporateAction[]> {
    const prompt = `Generate a realistic list of 5 upcoming corporate actions (earnings, dividends, splits, board meetings) for top Indian stocks (like RELIANCE, TCS, HDFCBANK) in the next 7 days.
    Return JSON matching the schema.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                symbol: { type: Type.STRING },
                company: { type: Type.STRING },
                date: { type: Type.STRING },
                type: { type: Type.STRING },
                details: { type: Type.STRING }
              },
              required: ["symbol", "company", "date", "type", "details"]
            }
          }
        }
      });
      return JSON.parse(response.text || "[]");
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  async getUSCorporateActions(): Promise<CorporateAction[]> {
    const prompt = `Generate a realistic list of 5 upcoming corporate actions (earnings, dividends, splits, board meetings) for top US stocks (like AAPL, MSFT, TSLA) in the next 7 days.
    Return JSON matching the schema.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                symbol: { type: Type.STRING },
                company: { type: Type.STRING },
                date: { type: Type.STRING },
                type: { type: Type.STRING },
                details: { type: Type.STRING }
              },
              required: ["symbol", "company", "date", "type", "details"]
            }
          }
        }
      });
      return JSON.parse(response.text || "[]");
    } catch (err) {
      console.error(err);
      return [];
    }
  }
};

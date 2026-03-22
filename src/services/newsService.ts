import { GoogleGenAI, Type } from "@google/genai";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

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
    const docRef = doc(db, "news_cache", "macro_events");
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (Date.now() - data.timestamp < 12 * 60 * 60 * 1000) { // 12 hours cache
          return data.events as MacroEvent[];
        }
      }
    } catch (err) {
      console.error("Error reading from cache:", err);
    }

    const today = new Date();
    const past7 = new Date(today);
    past7.setDate(today.getDate() - 7);
    const future7 = new Date(today);
    future7.setDate(today.getDate() + 7);

    const prompt = `Generate a realistic list of 5 macroeconomic events for the period between ${past7.toISOString().split('T')[0]} and ${future7.toISOString().split('T')[0]}. Include events from US, India, and Global.
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
      const parsed = JSON.parse(response.text || "[]");
      try {
        await setDoc(docRef, { events: parsed, timestamp: Date.now() });
      } catch (e) { console.error(e); }
      return parsed;
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  async getIndianCorporateActions(): Promise<CorporateAction[]> {
    const docRef = doc(db, "news_cache", "ind_corp_actions");
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (Date.now() - data.timestamp < 12 * 60 * 60 * 1000) {
          return data.actions as CorporateAction[];
        }
      }
    } catch (err) {
      console.error("Error reading from cache:", err);
    }

    const today = new Date();
    const future15 = new Date(today);
    future15.setDate(today.getDate() + 15);

    const prompt = `Generate a realistic list of 5 upcoming corporate actions (earnings, dividends, splits, board meetings) for top Indian stocks (like RELIANCE, TCS, HDFCBANK) strictly between ${today.toISOString().split('T')[0]} and ${future15.toISOString().split('T')[0]}. Do not include any old data.
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
      const parsed = JSON.parse(response.text || "[]");
      try {
        await setDoc(docRef, { actions: parsed, timestamp: Date.now() });
      } catch (e) { console.error(e); }
      return parsed;
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  async getUSCorporateActions(): Promise<CorporateAction[]> {
    const docRef = doc(db, "news_cache", "us_corp_actions");
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (Date.now() - data.timestamp < 12 * 60 * 60 * 1000) {
          return data.actions as CorporateAction[];
        }
      }
    } catch (err) {
      console.error("Error reading from cache:", err);
    }

    const today = new Date();
    const future15 = new Date(today);
    future15.setDate(today.getDate() + 15);

    const prompt = `Generate a realistic list of 5 upcoming corporate actions (earnings, dividends, splits, board meetings) for top US stocks (like AAPL, MSFT, TSLA) strictly between ${today.toISOString().split('T')[0]} and ${future15.toISOString().split('T')[0]}. Do not include any old data.
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
      const parsed = JSON.parse(response.text || "[]");
      try {
        await setDoc(docRef, { actions: parsed, timestamp: Date.now() });
      } catch (e) { console.error(e); }
      return parsed;
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  async getGlobalNews(cat: string): Promise<{headline: string, summary: string, source: string, time: string}[]> {
    const docRef = doc(db, "news_cache", `global_news_${cat}`);
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (Date.now() - data.timestamp < 6 * 60 * 60 * 1000) { // 6 hours cache for news
          return data.news as {headline: string, summary: string, source: string, time: string}[];
        }
      }
    } catch (err) {
      console.error("Error reading from cache:", err);
    }

    const today = new Date().toISOString().split('T')[0];
    const prompt = `Generate 5 realistic, up-to-date news headlines and short summaries for the ${cat} market as of ${today}.
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
                headline: { type: Type.STRING },
                summary: { type: Type.STRING },
                source: { type: Type.STRING },
                time: { type: Type.STRING }
              },
              required: ["headline", "summary", "source", "time"]
            }
          }
        }
      });
      const parsed = JSON.parse(response.text || "[]");
      try {
        await setDoc(docRef, { news: parsed, timestamp: Date.now() });
      } catch (e) { console.error(e); }
      return parsed;
    } catch (err) {
      console.error(err);
      return [];
    }
  }
};

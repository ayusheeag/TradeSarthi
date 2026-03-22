import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy for Dhan Instruments (CSV)
  app.get("/api/dhan-instruments", async (req, res) => {
    try {
      const response = await fetch("https://images.dhan.co/api-data/api-scrip-master.csv");
      const text = await response.text();
      res.send(text);
    } catch (error) {
      res.status(500).send("Failed to fetch Dhan instruments");
    }
  });

  // Proxy for Dhan API
  app.all("/api/dhan/*", async (req, res) => {
    const path = req.params[0];
    const queryParams = new URLSearchParams(req.query as any);
    
    const clientId = process.env.DHAN_CLIENT_ID;
    const accessToken = process.env.DHAN_ACCESS_TOKEN;

    if (!accessToken) {
      return res.status(401).json({ error: "Dhan Access Token not configured" });
    }

    const url = `https://api.dhan.co/${path}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

    try {
      const response = await fetch(url, {
        method: req.method,
        headers: {
          "access-token": accessToken,
          "client-id": clientId || "",
          "Content-Type": "application/json"
        },
        body: req.method !== "GET" ? JSON.stringify(req.body) : undefined
      });
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch from Dhan API" });
    }
  });

  // Proxy for Yahoo Finance
  app.get("/api/yahoo/:endpoint/:symbol", async (req, res) => {
    const { endpoint, symbol } = req.params;
    const queryParams = new URLSearchParams(req.query as any);
    
    let url = "";
    if (endpoint === "search") {
      url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&${queryParams.toString()}`;
    } else if (endpoint === "chart") {
      url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${queryParams.toString()}`;
    }

    if (!url) return res.status(400).json({ error: "Invalid endpoint" });

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch from Yahoo Finance" });
    }
  });

  // Proxy for NSE India
  app.get("/api/nse/:type", async (req, res) => {
    // We'll fetch Nifty 50 stocks and sort them ourselves for better reliability
    const url = `https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050`;
    
    try {
      const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
      };

      // Step 1: Get cookies from the home page
      const homeResponse = await fetch("https://www.nseindia.com/", { headers });
      const cookies = homeResponse.headers.get("set-cookie");
      
      // Step 2: Fetch the actual data using the cookies
      const response = await fetch(url, {
        headers: {
          ...headers,
          "Accept": "*/*",
          "Cookie": cookies || "",
          "Referer": "https://www.nseindia.com/market-data/live-equity-market",
          "X-Requested-With": "XMLHttpRequest"
        }
      });
      
      if (!response.ok) throw new Error(`NSE API responded with ${response.status}`);
      
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("NSE Proxy Error:", error.message);
      res.status(500).json({ error: "Failed to fetch from NSE India", details: error.message });
    }
  });

  // Proxy for Twelve Data
  app.get("/api/twelvedata/:endpoint", async (req, res) => {
    const { endpoint } = req.params;
    const queryParams = new URLSearchParams(req.query as any);
    const apiKey = process.env.TWELVE_DATA_API_KEY;
    if (!apiKey) return res.status(401).json({ error: "Twelve Data API key not configured" });

    queryParams.set("apikey", apiKey);

    try {
      const response = await fetch(`https://api.twelvedata.com/${endpoint}?${queryParams.toString()}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch from Twelve Data" });
    }
  });

  // Proxy for BSE Announcements
  app.get("/api/bse/announcements", async (req, res) => {
    try {
      const { pageno, strCat, strPrevDate, strToDate, strType, subcategory } = req.query;
      const url = new URL("https://api.bseindia.com/BseIndiaAPI/api/AnnSubCategoryGetData/w");
      if (pageno) url.searchParams.append("pageno", pageno as string);
      if (strCat) url.searchParams.append("strCat", strCat as string);
      if (strPrevDate) url.searchParams.append("strPrevDate", strPrevDate as string);
      if (strToDate) url.searchParams.append("strToDate", strToDate as string);
      if (strType) url.searchParams.append("strType", strType as string);
      if (subcategory) url.searchParams.append("subcategory", subcategory as string);
      url.searchParams.append("strScrip", "");
      url.searchParams.append("strSearch", "P");

      const response = await fetch(url.toString(), {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          "Accept": "application/json, text/plain, */*",
          "Origin": "https://www.bseindia.com",
          "Referer": "https://www.bseindia.com/"
        }
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("BSE API Error:", error);
      res.status(500).json({ error: "Failed to fetch BSE announcements" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

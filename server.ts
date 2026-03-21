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

  // Proxy for LunarCrush
  app.get("/api/lunarcrush/*", async (req, res) => {
    const lcPath = (req.params as any)[0];
    const apiKey = process.env.LUNARCRUSH_API_KEY;
    if (!apiKey) return res.status(401).json({ error: "LunarCrush API key not configured" });

    const queryParams = new URLSearchParams(req.query as any);
    const qs = queryParams.toString();
    const url = `https://lunarcrush.com/api4/public/${lcPath}${qs ? "?" + qs : ""}`;

    try {
      const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${apiKey}` }
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch from LunarCrush" });
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

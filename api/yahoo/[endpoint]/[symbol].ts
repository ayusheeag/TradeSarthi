export default async function handler(req: any, res: any) {
  const { endpoint, symbol, ...queryRest } = req.query;
  const queryParams = new URLSearchParams(queryRest as any);

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
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch from Yahoo Finance" });
  }
}

export default async function handler(req: any, res: any) {
  const url = `https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050`;

  try {
    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "en-US,en;q=0.9",
    };

    const homeResponse = await fetch("https://www.nseindia.com/", { headers });
    const cookies = homeResponse.headers.get("set-cookie");

    const response = await fetch(url, {
      headers: {
        ...headers,
        Accept: "*/*",
        Cookie: cookies || "",
        Referer: "https://www.nseindia.com/market-data/live-equity-market",
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    if (!response.ok) throw new Error(`NSE API responded with ${response.status}`);

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("NSE Proxy Error:", error.message);
    res.status(500).json({ error: "Failed to fetch from NSE India", details: error.message });
  }
}

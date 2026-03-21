export default async function handler(req: any, res: any) {
  const { endpoint, ...queryRest } = req.query;
  const queryParams = new URLSearchParams(queryRest as any);

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
}

export default async function handler(req: any, res: any) {
  const pathSegments: string[] = Array.isArray(req.query.path) ? req.query.path : [req.query.path];
  const urlPath = pathSegments.join("/");

  // Strip the dynamic path param before forwarding query string
  const { path: _path, ...queryRest } = req.query;
  const queryParams = new URLSearchParams(queryRest as any);

  const clientId = process.env.DHAN_CLIENT_ID;
  const accessToken = process.env.DHAN_ACCESS_TOKEN;

  if (!accessToken) {
    return res.status(401).json({ error: "Dhan Access Token not configured" });
  }

  const url = `https://api.dhan.co/${urlPath}${queryParams.toString() ? "?" + queryParams.toString() : ""}`;

  try {
    const response = await fetch(url, {
      method: req.method,
      headers: {
        "access-token": accessToken,
        "client-id": clientId || "",
        "Content-Type": "application/json",
      },
      body: req.method !== "GET" ? JSON.stringify(req.body) : undefined,
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch from Dhan API" });
  }
}

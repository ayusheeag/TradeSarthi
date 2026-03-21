export default async function handler(req: any, res: any) {
  try {
    const response = await fetch("https://images.dhan.co/api-data/api-scrip-master.csv");
    const text = await response.text();
    res.setHeader("Content-Type", "text/csv");
    res.send(text);
  } catch (error) {
    res.status(500).send("Failed to fetch Dhan instruments");
  }
}

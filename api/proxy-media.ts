export default async function handler(req: any, res: any) {
  // Set permissive CORS headers for media proxying
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const mediaUrl = req.query?.url as string;
  if (!mediaUrl) {
    res.status(400).send("URL required");
    return;
  }

  try {
    const response = await fetch(mediaUrl);
    if (!response.ok) {
      throw new Error(`Status: ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const base64 = Buffer.from(buffer).toString("base64");
    
    res.status(200).json({ data: base64, mimeType: contentType });
  } catch (e: any) {
    console.error("Proxy fetch failed:", e);
    res.status(500).send("Failed to fetch media");
  }
}

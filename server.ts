import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import FormData from "form-data";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ 
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Serve static files from public directory
  app.use(express.static(path.join(process.cwd(), 'public')));

  // Proxy for Gemini to fetch media without CORS issues
  app.get("/api/proxy-media", async (req, res) => {
    const mediaUrl = req.query.url as string;
    if (!mediaUrl) return res.status(400).send("URL required");
    try {
      const response = await fetch(mediaUrl);
      if (!response.ok) throw new Error(`Status: ${response.status}`);
      
      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") || "image/jpeg";
      const base64 = Buffer.from(buffer).toString("base64");
      
      res.json({ data: base64, mimeType: contentType });
    } catch (e) {
      console.error("Proxy fetch failed:", e);
      res.status(500).send("Failed to fetch media");
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Server failed to start:", err);
  process.exit(1);
});

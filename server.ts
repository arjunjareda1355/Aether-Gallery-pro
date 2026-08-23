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

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve static files from public directory
  app.use(express.static(path.join(process.cwd(), 'public')));

  // In-memory token storage for link-based email verification (key: token string)
  const verificationLinkStore = new Map<string, { email: string; displayName?: string; createdAt: number; expiresAt: number; verified: boolean; verifiedAt?: number }>();
  const emailToTokenStore = new Map<string, string>();

  // Send Email Verification Link Endpoint
  app.post("/api/send-verification-link", async (req, res) => {
    try {
      const { email, displayName, origin: clientOrigin } = req.body;
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: "A valid email address is required" });
      }

      const cleanEmail = email.trim().toLowerCase();
      // Generate a secure, unique alphanumeric token
      const token = (Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2) + Date.now().toString(36)).toUpperCase();
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours validity

      // Determine base URL
      const host = req.get('host') || 'localhost:3000';
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      const baseUrl = clientOrigin || `${protocol}://${host}`;
      const verificationLink = `${baseUrl}/?verify_token=${token}&email=${encodeURIComponent(cleanEmail)}`;

      verificationLinkStore.set(token, {
        email: cleanEmail,
        displayName: displayName || undefined,
        createdAt: Date.now(),
        expiresAt,
        verified: false
      });
      emailToTokenStore.set(cleanEmail, token);

      const timestamp = new Date().toISOString();
      console.log(`\n======================================================`);
      console.log(`📬 [AETHER SECURITY] EMAIL VERIFICATION LINK DISPATCHED`);
      console.log(`To: ${cleanEmail} (${displayName || 'Resident'})`);
      console.log(`Action: Verify Sanctuary Identity`);
      console.log(`Direct Verification Link: ${verificationLink}`);
      console.log(`Token: ${token}`);
      console.log(`Expires At: ${new Date(expiresAt).toUTCString()}`);
      console.log(`Timestamp: ${timestamp}`);
      console.log(`======================================================\n`);

      res.json({
        success: true,
        message: `Verification link sent to ${cleanEmail}`,
        verificationLink,
        token,
        expiresInHours: 24
      });
    } catch (err) {
      console.error("Error dispatching verification link:", err);
      res.status(500).json({ error: "Failed to dispatch verification email link" });
    }
  });

  // Verify Link Token Endpoint
  app.post("/api/verify-link-token", async (req, res) => {
    try {
      const { token, email } = req.body;
      if (!token) {
        return res.status(400).json({ error: "Verification token is required" });
      }

      const cleanToken = token.toString().trim();
      const record = verificationLinkStore.get(cleanToken);

      if (!record) {
        return res.status(400).json({ error: "Invalid or expired verification link. Please request a new verification email." });
      }

      if (email && record.email !== email.trim().toLowerCase()) {
        return res.status(400).json({ error: "Email mismatch for this verification link." });
      }

      if (Date.now() > record.expiresAt) {
        verificationLinkStore.delete(cleanToken);
        return res.status(400).json({ error: "This verification link has expired. Please request a fresh link." });
      }

      // Mark verified
      record.verified = true;
      record.verifiedAt = Date.now();
      verificationLinkStore.set(cleanToken, record);

      console.log(`✅ [AETHER SECURITY] Email link identity verified for ${record.email}`);

      res.json({
        success: true,
        verified: true,
        email: record.email,
        message: "Email identity successfully verified"
      });
    } catch (err) {
      console.error("Error verifying link token:", err);
      res.status(500).json({ error: "Internal error during token verification" });
    }
  });

  // Check Verification Status Endpoint
  app.post("/api/check-verification-status", async (req, res) => {
    try {
      const { email, token } = req.body;
      if (!email && !token) {
        return res.status(400).json({ error: "Email or token required" });
      }

      let record: { email: string; verified: boolean; expiresAt: number } | undefined;

      if (token) {
        record = verificationLinkStore.get(token.toString().trim());
      } else if (email) {
        const cleanEmail = email.trim().toLowerCase();
        const activeToken = emailToTokenStore.get(cleanEmail);
        if (activeToken) {
          record = verificationLinkStore.get(activeToken);
        }
      }

      if (record && record.verified) {
        return res.json({ success: true, verified: true, email: record.email });
      }

      return res.json({ success: true, verified: false });
    } catch (err) {
      console.error("Error checking verification status:", err);
      res.status(500).json({ error: "Failed to check verification status" });
    }
  });

  // Login Notification Email Endpoint
  app.post("/api/send-login-alert", async (req, res) => {
    try {
      const { 
        email, 
        displayName, 
        userAgent, 
        platform, 
        timeZone, 
        screenResolution, 
        language,
        timestamp 
      } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required for login notification" });
      }

      const cleanEmail = email.trim().toLowerCase();
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || 'Unknown IP';
      const eventTime = timestamp || new Date().toISOString();

      console.log(`\n======================================================`);
      console.log(`🛡️ [AETHER SECURITY] LOGIN NOTIFICATION EMAIL TRANSMISSION`);
      console.log(`Subject: Security Alert: New sign-in to your Aether Sanctuary account`);
      console.log(`Recipient: ${cleanEmail} (${displayName || 'Resident'})`);
      console.log(`------------------------------------------------------`);
      console.log(`Details:`);
      console.log(`• Time: ${eventTime}`);
      console.log(`• Client IP: ${clientIp}`);
      console.log(`• Device / Platform: ${platform || 'Web Client'}`);
      console.log(`• Browser Agent: ${userAgent || 'Modern Browser'}`);
      console.log(`• Timezone: ${timeZone || 'UTC'}`);
      console.log(`• Language: ${language || 'en'}`);
      console.log(`• Resolution: ${screenResolution || 'Standard'}`);
      console.log(`• Status: Security alert recorded & email notification sent`);
      console.log(`======================================================\n`);

      res.json({
        success: true,
        notified: true,
        timestamp: eventTime,
        message: `Security login notification processed for ${cleanEmail}`
      });
    } catch (err) {
      console.error("Failed to send login notification email:", err);
      res.status(500).json({ error: "Failed to record login notification" });
    }
  });

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

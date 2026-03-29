import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;
  const distPath = path.join(process.cwd(), 'dist');

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));

  app.post("/api/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const formData = new FormData();
      formData.append('reqtype', 'fileupload');
      
      const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
      formData.append('fileToUpload', blob, req.file.originalname);

      const response = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Catbox upload failed with status ${response.status}`);
      }

      const url = await response.text();
      res.json({ url });
    } catch (error) {
      console.error("[SERVER] Upload error:", error);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  app.get("/api/download", async (req, res) => {
    try {
      const { url, filename } = req.query;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "URL is required" });
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      
      const name = filename ? String(filename) : url.split('/').pop() || 'download';
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(name)}"`);

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.send(buffer);
    } catch (error) {
      console.error("[SERVER] Download error:", error);
      res.status(500).json({ error: "Download failed" });
    }
  });

  // Serve static files from dist if it exists, otherwise use Vite middleware
  if (fs.existsSync(distPath)) {
    console.log("[SERVER] Serving static files from dist...");
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    console.log("[SERVER] Development mode: Loading Vite middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Live at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("[SERVER] CRITICAL ERROR:", err);
});

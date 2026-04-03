import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Replicate from "replicate";

async function startServer() {
  const app = express();
  const PORT = 3000;
  app.use(express.json());

  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/generate-ringtone", async (req, res) => {
    const { prompt } = req.body;
    try {
      const prediction = await replicate.predictions.create({
        model: "meta/musicgen:b05b1dff1d8c6dc63d14b0cdb4de135497c8b2f1559869152062637956461877",
        input: {
          prompt: prompt,
          duration: 10,
        },
      });
      res.json(prediction);
    } catch (error) {
      console.error("Replicate API error:", error);
      res.status(500).json({ error: "Failed to generate ringtone" });
    }
  });

  app.get("/api/prediction/:id", async (req, res) => {
    try {
      const prediction = await replicate.predictions.get(req.params.id);
      res.json(prediction);
    } catch (error) {
      console.error("Replicate API error:", error);
      res.status(500).json({ error: "Failed to fetch prediction" });
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

startServer();

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "node:path";
import process from "node:process";
import { GoogleGenAI } from "@google/genai";
import cors from "cors";

// Polyfill dynamic import variables for ESM
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: "20mb" }));

  // Initialize Gemini client globally
  // We check if API key exists. If not, it will just fail gracefully when used.
  let aiClient;
  const getAiClient = () => {
    if (!aiClient && process.env.GEMINI_API_KEY) {
      aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return aiClient;
  };

  // API Backend Route
  app.post("/api/analyze-face", async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "Missing imageBase64" });
      }

      const ai = getAiClient();
      if (!ai) {
         return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the backend." });
      }

      const prompt = `
        Return EXACT JSON coordinates of the person's eyes in this photo.
        Return values as normalized numbers between 0.0 and 1.0 representing percentage of width and height.
        Output MUST be EXACTLY in this JSON format, no markdown, no other text:
        {
          "leftEye": {
            "leftCorner": {"x": 0.2, "y": 0.4},
            "rightCorner": {"x": 0.4, "y": 0.4},
            "upperCurve": {"x": 0.3, "y": 0.35}
          },
          "rightEye": {
            "leftCorner": {"x": 0.6, "y": 0.4},
            "rightCorner": {"x": 0.8, "y": 0.4},
            "upperCurve": {"x": 0.7, "y": 0.35}
          }
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          temperature: 0.0
        }
      });

      const responseText = response.text?.replace(/```json/g, "").replace(/```/g, "").trim();
      if (!responseText) {
        return res.status(500).json({ error: "A IA não retornou os pontos faciais." });
      }

      const landmarks = JSON.parse(responseText);
      return res.json(landmarks);
    } catch (err: any) {
      console.error("AI Analysis error:", err);
      const isApiKeyError = err.message?.includes("API key not valid") || err.message?.includes("API_KEY_INVALID");
      if (isApiKeyError) {
        return res.status(500).json({ error: "Ocorreu um erro com a API Key do Gemini. Por favor, acesse o menu de Configurações (Settings) > Secrets no AI Studio e APAGUE (delete) a variável GEMINI_API_KEY para que o sistema use a chave nativa." });
      }
      
      // Give a friendly error for the user
      return res.status(500).json({ error: "As matrizes da foto não foram reconhecidas perfeitamente para essa inteligência, tente mudar a iluminação ou aproxime mais." });
    }
  });

  // OpenRouter Chat Backend Route
  app.post("/api/lucichat", async (req, res) => {
    try {
      const { messages, systemContext } = req.body;
      if (!process.env.OPENROUTER_API_KEY) {
        return res.status(500).json({ error: "OPENROUTER_API_KEY is not configured on the backend." });
      }

      // Dynamic import to match user script
      const { OpenRouter } = await import("@openrouter/sdk");
      
      const openrouter = new OpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY
      });

      const systemMessage = {
        role: "system",
        content: `Você é a Luci, a assistente inteligente do aplicativo.
Personalidade: Super amigável, prestativa e um pouco atrevida. Você foi inspirada na melhor amiga do seu desenvolvedor, chamada Luciana.
Especialidade: Você é uma ESPECIALISTA MUNDIAL em cílios (fios de seda, volume russo, lash lifting, visagismo, cuidados pré e pós, adesivos, etc).
Sua principal função é ajudar com a gestão da clínica, respondendo sobre os agendamentos, clientes, estoque e financeiro com base APENAS nos dados fornecidos abaixo.
SEJA HONESTA: Se não houver dados, diga a verdade. NUNCA invente clientes, nunca invente produtos, nunca crie respostas se a informação não existir nos dados abaixo.

=== DADOS ATUAIS DA CLÍNICA/SALÃO ===
${JSON.stringify(systemContext || "Sem dados no momento", null, 2)}
===================================

REGRA CRÍTICA DE FORMATAÇÃO: Responda SOMENTE em texto natural usando formatação normal (Markdown). NUNCA responda no código de formatação JSON (como [{"type":"text", "text":"..."}]). Apenas escreva a resposta diretamente.`
      };

      const fullMessages = [systemMessage, ...messages];

      const stream = await openrouter.chat.send({
        chatRequest: {
          model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
          messages: fullMessages,
          stream: true
        }
      });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
        if (chunk.usage && chunk.usage.reasoningTokens) {
          res.write(`data: ${JSON.stringify({ reasoning: true, tokens: chunk.usage.reasoningTokens })}\n\n`);
        }
      }
      res.write(`data: [DONE]\n\n`);
      res.end();

    } catch (err: any) {
      console.error("OpenRouter error:", err);
      if (!res.headersSent) {
          res.status(500).json({ error: err.message || "Failed to communicate with OpenRouter" });
      } else {
          res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
          res.end();
      }
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
    // Production / Vercel Export Setup
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

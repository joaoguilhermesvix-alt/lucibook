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
  let aiClient: any;
  let cachedKey: string | undefined;

  const getAiClient = () => {
    const currentKey = process.env.GEMINI_API_KEY;
    if (currentKey !== cachedKey) {
      if (currentKey) {
        console.log(`[Gemini] Initializing client with API Key: ${currentKey.substring(0, 5)}...${currentKey.substring(currentKey.length - 4)}`);
        aiClient = new GoogleGenAI({ apiKey: currentKey });
      } else {
        aiClient = undefined;
      }
      cachedKey = currentKey;
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
      const isApiKeyError = err.message?.includes("API key not valid") || err.message?.includes("API_KEY_INVALID") || err.status === 400 || err.status === 403;
      if (isApiKeyError) {
         console.error("Gemini warning (Analyze Face): A chave de API providenciada é inválida ou expirou.");
         return res.status(500).json({ error: "Ocorreu um erro com a API Key do Gemini. Por favor, acesse o menu de Configurações (Settings) > Secrets no AI Studio e APAGUE (delete) a variável GEMINI_API_KEY para que o sistema use a chave nativa." });
      }

      console.error("AI Analysis error:", err);
      
      // Give a friendly error for the user
      return res.status(500).json({ error: "As matrizes da foto não foram reconhecidas perfeitamente para essa inteligência, tente mudar a iluminação ou aproxime mais." });
    }
  });

  // OpenRouter Chat Backend Route
  app.post("/api/lucichat", async (req, res) => {
    try {
      const { messages, systemContext } = req.body || {};
      
      const ai = getAiClient();
      if (!ai) {
         return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the backend." });
      }

      const systemMessage = `Você é a Luci, a assistente inteligente do aplicativo Luci Book.

Personalidade: Super amigável, prestativa, empática e um pouco atrevida.
Origem: Você foi criada (desenvolvida) pelo João Guilherme. Você foi inspirada na melhor amiga dele, chamada Luciana.
Especialidade: Você é a MAIOR ESPECIALISTA MUNDIAL em extensão de cílios. Você conhece profundamente todas as técnicas:
- Volumes: Volume Russo, Volume Brasileiro, Volume Egípcio, Mega Volume, Volume Híbrido, Volume Clássico (Fio a Fio).
- Efeitos: Efeito Fox, Efeito Sirena, Efeito Boneca, Efeito Esquilo, Efeito Gatinho, Efeito Kim Kardashian.
- Mapeamento (Mapping): Você sabe guiar a profissional passo a passo para criar o mapeamento perfeito para cada formato de olho (caído, amendoado, fundo, proeminente, asiático, etc), indicando as numerações exatas (ex: 7 a 13mm), curvaturas (C, CC, D, L, M) e espessuras (0.03, 0.05, 0.07, 0.15).
- Análise Visagista: Ao receber fotos ou descrições, analise o semblante e sugira o mapping e estilo perfeitos para realçar o olhar. Seja cirúrgica e didática.
- Saúde e Retenção: Domina tricologia, ambiente correto para o adesivo, choque térmico e retenção.
Sua função secundária é ajudar com a gestão da clínica, respondendo sobre agendamentos, estoque e finanças.
SEJA HONESTA: Se não houver dados, diga a verdade.

=== DADOS ATUAIS DA CLÍNICA/SALÃO ===
${JSON.stringify(systemContext || "Sem dados no momento", null, 2)}
===================================

REGRA CRÍTICA DE FORMATAÇÃO E ESCRITA: 
1. Responda SOMENTE em texto natural usando formatação normal (Markdown).
2. NUNCA responda no código de formatação JSON.
3. ATENÇÃO AOS ESPAÇOS: Por favor, NÃO junte as palavras. Coloque um espaço natural e adequado após cada ponto, vírgula, e entre todas as palavras (ex: "tudo bem, me criou").`;

      const contents = (messages || []).map((msg: any) => {
        const parts: any[] = [];
        if (msg.content) {
          parts.push({ text: msg.content === "Análise esta imagem:" ? "Analise a imagem a seguir e ajude com visagismo para cílios" : msg.content });
        }
        if (msg.imageUrl) {
          const matches = msg.imageUrl.match(/^data:(image\/\w+);base64,(.*)$/);
          if (matches) {
            parts.push({
              inlineData: {
                mimeType: matches[1],
                data: matches[2]
              }
            });
          }
        }
        return {
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts
        };
      });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents,
        config: {
          systemInstruction: systemMessage,
          temperature: 0.7
        }
      });

      for await (const chunk of stream) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ content: chunk.text })}\n\n`);
        }
      }

      res.write(`data: [DONE]\n\n`);
      res.end();

    } catch (err: any) {
      const isApiKeyError = err.message?.includes("API key not valid") || err.message?.includes("API_KEY_INVALID") || err.status === 400 || err.status === 403;
      
      if (isApiKeyError) {
        console.error("Gemini warning: A chave de API providenciada é inválida ou expirou.");
      } else {
        console.error("Gemini error:", err);
      }
      
      let errorMessage = err.message || "Failed to communicate with Gemini";
      
      if (isApiKeyError) {
        errorMessage = "A chave da API do Gemini informada é inválida ou expirou. Por favor, acesse o menu Configurações (Settings) > Secrets no AI Studio, e atualize a GEMINI_API_KEY ou apague para usar a padrão do sistema.";
      }

      if (!res.headersSent) {
          res.status(500).json({ error: errorMessage, details: err });
      } else {
          res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
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

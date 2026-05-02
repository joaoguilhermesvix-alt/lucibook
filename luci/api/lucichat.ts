import type { VercelRequest, VercelResponse } from '@vercel/node';
import { OpenRouter } from '@openrouter/sdk';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { messages, systemContext } = req.body || {};
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "A chave GEMINI_API_KEY não está configurada no Vercel (Environments)." });
    }

    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
      console.error("Gemini warning (Serverless): A chave de API providenciada é inválida ou expirou.");
    } else {
      console.error("Gemini error:", err);
    }
    
    let errorMessage = err.message || "Failed to communicate with Gemini";
    
    if (isApiKeyError) {
      errorMessage = "A chave da API do Gemini informada é inválida ou expirou. Por favor, acesse o menu Configurações (Settings) > Secrets e atualize a GEMINI_API_KEY ou apague para usar a padrão do sistema.";
    }

    if (!res.headersSent) {
      res.status(500).json({ error: errorMessage });
    } else {
      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
      res.end();
    }
  }
}

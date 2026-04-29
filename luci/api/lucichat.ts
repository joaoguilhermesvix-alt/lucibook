import type { VercelRequest, VercelResponse } from '@vercel/node';
import { OpenRouter } from '@openrouter/sdk';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { messages, systemContext } = req.body || {};
    if (!process.env.OPENROUTER_API_KEY) {
      // Allow fallback to headers if VITE_ prefix is somehow used or pass through env
      return res.status(500).json({ error: "A chave OPENROUTER_API_KEY não está configurada no Vercel (Environments)." });
    }

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

    const fullMessages = [systemMessage, ...(messages || [])];

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
}

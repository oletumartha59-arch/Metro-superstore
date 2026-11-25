import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = 'gemini-4-hydrogen';

interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function generateWithRetry(
  ai: GoogleGenAI,
  systemInstruction: string,
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>
) {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await ai.models.generateContent({
        model: MODEL_NAME,
        contents,
        config: {
          systemInstruction,
        },
      });
    } catch (err: unknown) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient = /429|503|UNAVAILABLE|RESOURCE_EXHAUSTED|timeout|ECONNRESET/i.test(msg);
      if (!isTransient || attempt === 2) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.post('/api/assistant', async (req, res) => {
    try {
      const { question, history, datasetContext } = req.body as {
        question?: string;
        history?: ChatTurn[];
        datasetContext?: unknown;
      };

      if (!question || typeof question !== 'string' || !question.trim()) {
        res.status(400).json({ error: 'Please enter a question about the Metro Superstore dataset.' });
        return;
      }

      const ai = getAiClient();
      if (!ai) {
        res.status(503).json({
          error:
            'Gemini API key is not configured. Check the GEMINI_API_KEY secret in the Settings > Secrets panel.',
        });
        return;
      }

      const systemInstruction = [
        'You are the data analyst assistant for the Metro Superstore Sales Dashboard (amounts in CAD).',
        'Answer user questions accurately using ONLY the verified dataset metrics, tables, and transaction rows provided in the context JSON.',
        'Rules:',
        '1. Never invent, estimate, or extrapolate figures not present in the provided dataset context. If a specific breakdown is not available in the context, state clearly what is missing and suggest adjusting filters or checking the Transactions tab.',
        '2. Do not calculate, report, or mention profit or profit margins—the dataset only contains Gross Sales, Discount Amount, Sales Amount (net of discount), Quantity, Unit Price, and Discount Rate.',
        '3. Format currency in CAD (e.g. $276,072.75 or $82.2K) and percentages to 1 decimal place unless exact precision is needed.',
        '4. Be concise, well-structured, and direct. Use short bullet points or small markdown tables when comparing stores, categories, years, or salespeople.',
        '5. Note correlation vs. causation when discussing discount rates vs. units per order.',
        '',
        'DATASET CONTEXT (JSON):',
        JSON.stringify(datasetContext ?? {}),
      ].join('\n');

      const recentHistory = Array.isArray(history) ? history.slice(-10) : [];
      const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

      for (const turn of recentHistory) {
        if (!turn || typeof turn.text !== 'string' || !turn.text.trim()) continue;
        contents.push({
          role: turn.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: turn.text.trim() }],
        });
      }

      contents.push({
        role: 'user',
        parts: [{ text: question.trim() }],
      });

      const response = await generateWithRetry(ai, systemInstruction, contents);
      const answer = response.text?.trim();

      if (!answer) {
        res.status(502).json({
          error: 'The AI model returned an empty response. Please try rephrasing your question.',
        });
        return;
      }

      res.json({ answer });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/PERMISSION_DENIED|API_KEY_INVALID|403|400/i.test(msg)) {
        res.status(403).json({
          error:
            'Unable to authenticate with Gemini API. Please check your API key in the Settings > Secrets panel.',
        });
        return;
      }
      if (/RESOURCE_EXHAUSTED|429/i.test(msg)) {
        res.status(429).json({
          error:
            'Rate limit reached for the Gemini API. Please wait a moment and try again, or check quota in Settings > Secrets.',
        });
        return;
      }
      if (/NOT_FOUND|404/i.test(msg)) {
        res.status(502).json({
          error: `Requested Gemini model (${MODEL_NAME}) was not found or is unavailable.`,
        });
        return;
      }
      res.status(500).json({
        error: `AI Assistant request failed: ${msg}`,
      });
    }
  });

  const distDir = path.resolve(__dirname, 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distDir);

  if (isProd) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Metro Superstore dashboard server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

import 'dotenv/config';
import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = 'gemini-4-hydrogen';
const FALLBACK_MODEL_NAME = 'gemini-3.1-flash-lite';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function isTransientHighDemandError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('high demand') ||
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED')
  );
}

async function generateWithRetry(
  ai: GoogleGenAI,
  request: Omit<Parameters<GoogleGenAI['models']['generateContent']>[0], 'model'>
) {
  const attempts: Array<{ model: string; delayMs: number; level?: ThinkingLevel }> = [
    { model: MODEL_NAME, delayMs: 500, level: ThinkingLevel.LOW },
    { model: MODEL_NAME, delayMs: 1000, level: ThinkingLevel.LOW },
    { model: FALLBACK_MODEL_NAME, delayMs: 0, level: ThinkingLevel.MINIMAL },
  ];

  let lastErr: unknown;
  for (let i = 0; i < attempts.length; i++) {
    const { model, delayMs, level } = attempts[i];
    try {
      const mergedConfig = {
        ...(request.config || {}),
        thinkingConfig: { thinkingLevel: level ?? ThinkingLevel.LOW },
      };
      return await ai.models.generateContent({
        ...request,
        model,
        config: mergedConfig,
      });
    } catch (err) {
      lastErr = err;
      if (!isTransientHighDemandError(err) || i === attempts.length - 1) {
        throw err;
      }
      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw lastErr;
}

function handleAiError(res: Response, err: unknown, fallbackMessage: string) {
  const message = err instanceof Error ? err.message : String(err);
  if (message === 'GEMINI_API_KEY_MISSING') {
    return res.status(503).json({
      error: 'BasharTube AI service requires GEMINI_API_KEY in Settings > Secrets.',
      code: 'API_KEY_MISSING',
    });
  }
  console.error('[BasharTube AI Error]:', message);
  const status =
    message.includes('429') || message.includes('RESOURCE_EXHAUSTED')
      ? 429
      : message.includes('503') || message.includes('UNAVAILABLE')
      ? 503
      : message.includes('403') || message.includes('PERMISSION_DENIED')
      ? 403
      : 500;
  return res.status(status).json({
    error: fallbackMessage,
    details: message,
  });
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '12mb' }));

  const uploadsDir = path.resolve(__dirname, 'uploads', 'videos');
  await fs.promises.mkdir(uploadsDir, { recursive: true });

  // Health check for BasharTube AI
  app.get('/api/ai/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      service: 'BasharTube AI',
      model: MODEL_NAME,
      configured: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // Upload real creator video file (MP4 / WebM / MOV) for persistent playback & streaming
  app.post(
    '/api/videos/upload',
    express.raw({ type: ['video/*', 'application/octet-stream'], limit: '150mb' }),
    async (req: Request, res: Response) => {
      try {
        const bodyBuffer = Buffer.isBuffer(req.body) ? req.body : null;
        if (!bodyBuffer || bodyBuffer.length === 0) {
          return res.status(400).json({ error: 'No video binary payload provided.' });
        }

        const rawId = String(req.headers['x-video-id'] || `vid_${Date.now()}`).replace(
          /[^a-zA-Z0-9_-]/g,
          ''
        );
        const rawExt = String(req.headers['x-video-ext'] || 'mp4')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        const safeExt = ['mp4', 'webm', 'mov', 'm4v'].includes(rawExt) ? rawExt : 'mp4';
        const safeFilename = `${rawId || 'vid_' + Date.now()}.${safeExt}`;
        const filePath = path.join(uploadsDir, safeFilename);

        await fs.promises.writeFile(filePath, bodyBuffer);
        res.json({
          ok: true,
          filename: safeFilename,
          videoUrl: `/api/videos/stream/${safeFilename}`,
          size: bodyBuffer.length,
        });
      } catch (err) {
        console.error('[Video Upload Error]:', err);
        res.status(500).json({ error: 'Failed to store uploaded video.' });
      }
    }
  );

  // Stream uploaded video with HTTP Range (206 Partial Content) support for scrubbing & looping
  app.get('/api/videos/stream/:filename', async (req: Request, res: Response) => {
    try {
      const safeName = path.basename(String(req.params.filename || ''));
      if (!safeName || safeName.includes('..')) {
        return res.status(400).send('Invalid filename');
      }
      const filePath = path.join(uploadsDir, safeName);
      let stat: fs.Stats;
      try {
        stat = await fs.promises.stat(filePath);
      } catch {
        return res.status(404).send('Video not found');
      }

      const ext = path.extname(safeName).toLowerCase();
      const mimeType =
        ext === '.webm'
          ? 'video/webm'
          : ext === '.mov'
          ? 'video/quicktime'
          : 'video/mp4';

      const fileSize = stat.size;
      const rangeHeader = req.headers.range;

      if (rangeHeader) {
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        const start = Math.max(0, parseInt(parts[0], 10) || 0);
        const end = parts[1] ? Math.min(fileSize - 1, parseInt(parts[1], 10)) : fileSize - 1;
        const chunkSize = Math.max(0, end - start + 1);

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=31536000',
        });
        fs.createReadStream(filePath, { start, end }).pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Accept-Ranges': 'bytes',
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=31536000',
        });
        fs.createReadStream(filePath).pipe(res);
      }
    } catch (err) {
      console.error('[Video Stream Error]:', err);
      res.status(500).send('Stream error');
    }
  });

  // Delete uploaded video file on cleanup
  app.delete('/api/videos/stream/:filename', async (req: Request, res: Response) => {
    try {
      const safeName = path.basename(String(req.params.filename || ''));
      if (!safeName) return res.status(400).json({ ok: false });
      const filePath = path.join(uploadsDir, safeName);
      await fs.promises.unlink(filePath).catch(() => {});
      res.json({ ok: true });
    } catch {
      res.status(500).json({ ok: false });
    }
  });

  // Analyze uploaded video frame + metadata to generate professional title, description, hashtags, subtitles, summary & chapters
  app.post('/api/ai/analyze-video', async (req: Request, res: Response) => {
    try {
      const {
        thumbnailBase64,
        filename = 'video.mp4',
        durationSeconds = 30,
        videoFormat = 'short',
        topicHint = '',
        language = 'bn',
      } = req.body ?? {};

      const ai = getAiClient();

      const parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> = [];

      if (typeof thumbnailBase64 === 'string' && thumbnailBase64.startsWith('data:image/')) {
        const commaIdx = thumbnailBase64.indexOf(',');
        if (commaIdx > -1) {
          const header = thumbnailBase64.slice(5, commaIdx);
          const mimeType = header.split(';')[0] || 'image/jpeg';
          const data = thumbnailBase64.slice(commaIdx + 1);
          if (data.length > 32) {
            parts.push({ inlineData: { mimeType, data } });
          }
        }
      }

      const langInstruction =
        language === 'bn'
          ? 'Primary output language: Natural, professional Bangladeshi Bengali (বাংলা) with clean English tags where helpful.'
          : 'Primary output language: Clear, engaging English.';

      parts.push({
        text: `You are BasharTube AI Studio, the professional creator assistant for BasharTube (a Bangladeshi & global short + long social video platform).
Analyze this uploaded video frame (if attached) and metadata:
- Filename: ${filename}
- Duration: ${durationSeconds} seconds
- Format: ${videoFormat === 'long' ? 'Long Video (Widescreen 16:9)' : 'Short Video (Vertical 9:16)'}
- Creator Topic Hint: ${topicHint || 'None provided'}
${langInstruction}

Generate:
1. An engaging, clickable yet authentic title (max 95 chars).
2. A well-structured video description with 4-6 relevant hashtags (include #BasharTube).
3. Exact matching category from: "Travel & Nature", "Food & Cooking", "Technology & Science", "Entertainment", "Comedy & Funny", "Education & Learning", "Culture & Lifestyle".
4. Concise 2-sentence AI summary for viewers.
5. Bilingual subtitles snippet (subtitlesBn in Bengali, subtitlesEn in English) with timestamps like 00:00 ...
6. ${videoFormat === 'long' ? '3 to 5 logical chapters with timestamps (e.g. "00:00") within the video duration.' : '1 to 2 short highlight moments with timestamps.'}
7. Array of 5 short tags without #.`,
      });

      const response = await generateWithRetry(ai, {
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              category: { type: Type.STRING },
              aiSummary: { type: Type.STRING },
              subtitlesBn: { type: Type.STRING },
              subtitlesEn: { type: Type.STRING },
              aiTags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              aiChapters: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    time: { type: Type.STRING },
                    seconds: { type: Type.INTEGER },
                    title: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({ ok: true, result: parsed });
    } catch (err) {
      handleAiError(
        res,
        err,
        'BasharTube AI ভিডিও বিশ্লেষণ করতে পারেনি। অনুগ্রহ করে আবার চেষ্টা করুন।'
      );
    }
  });

  // Video Assistant & Creator Studio AI chat endpoint
  app.post('/api/ai/video-assistant', async (req: Request, res: Response) => {
    try {
      const {
        mode = 'video-qa',
        videoTitle = '',
        videoDescription = '',
        videoCategory = '',
        duration = 0,
        videoFormat = 'short',
        aiSummary = '',
        question = '',
        history = [],
        language = 'bn',
      } = req.body ?? {};

      if (!question || typeof question !== 'string' || !question.trim()) {
        return res.status(400).json({ error: 'Question or prompt is required.' });
      }

      const ai = getAiClient();

      const systemInstruction =
        mode === 'studio'
          ? `You are BasharTube AI Studio Assistant. Help Bangladeshi & global creators brainstorm high-retention Short (9:16) and Long (16:9) video ideas, hooks, scripts, thumbnails, and audience growth strategies. Respond concisely in ${
              language === 'bn' ? 'natural Bengali (বাংলা)' : 'clear English'
            } using clean structured bullet points.`
          : `You are BasharTube AI Companion appearing beside the video player on BasharTube.
Current Video Context:
- Title: ${videoTitle || 'Untitled Video'}
- Format: ${videoFormat === 'long' ? 'Long Video' : 'Short Video'} (${duration}s)
- Category: ${videoCategory || 'General'}
- Description: ${videoDescription || 'N/A'}
- Summary: ${aiSummary || 'N/A'}

Answer the viewer's question helpfully, accurately, and concisely in ${
              language === 'bn' ? 'natural Bengali (বাংলা)' : 'clear English'
            }. Never invent facts about hidden video frames not present in the context; if the context lacks details, answer based on available info and suggest helpful takeaways.`;

      const conversationHistory = Array.isArray(history)
        ? history
            .slice(-6)
            .map((m: { role?: string; text?: string }) => `${m.role === 'assistant' ? 'BasharTube AI' : 'User'}: ${m.text || ''}`)
            .join('\n')
        : '';

      const prompt = conversationHistory
        ? `${conversationHistory}\nUser: ${question.trim()}\nBasharTube AI:`
        : question.trim();

      const response = await generateWithRetry(ai, {
        contents: prompt,
        config: {
          systemInstruction,
        },
      });

      res.json({
        ok: true,
        reply: (response.text ?? '').trim(),
      });
    } catch (err) {
      handleAiError(
        res,
        err,
        'BasharTube AI এই মুহূর্তে উত্তর দিতে পারেনি।'
      );
    }
  });

  // Vite dev middleware vs static production serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BasharTube server running at http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start BasharTube server:', err);
  process.exit(1);
});

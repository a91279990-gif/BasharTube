import { VideoChapter, VideoFormat } from '../types';
import { normalizeAiChapters } from './videoFormat';

export interface AnalyzeVideoPayload {
  thumbnailBase64?: string;
  filename: string;
  durationSeconds: number;
  videoFormat: VideoFormat;
  topicHint?: string;
  language: 'bn' | 'en';
}

export interface AnalyzeVideoResult {
  title: string;
  description: string;
  category: string;
  aiSummary: string;
  subtitlesBn: string;
  subtitlesEn: string;
  aiTags: string[];
  aiChapters: VideoChapter[];
}

export async function analyzeVideoWithAi(
  payload: AnalyzeVideoPayload
): Promise<AnalyzeVideoResult> {
  const res = await fetch('/api/ai/analyze-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || 'BasharTube AI analysis failed.');
  }

  const raw = data.result || {};
  return {
    title: typeof raw.title === 'string' ? raw.title.trim() : '',
    description: typeof raw.description === 'string' ? raw.description.trim() : '',
    category: typeof raw.category === 'string' ? raw.category.trim() : 'Entertainment',
    aiSummary: typeof raw.aiSummary === 'string' ? raw.aiSummary.trim() : '',
    subtitlesBn: typeof raw.subtitlesBn === 'string' ? raw.subtitlesBn.trim() : '',
    subtitlesEn: typeof raw.subtitlesEn === 'string' ? raw.subtitlesEn.trim() : '',
    aiTags: Array.isArray(raw.aiTags)
      ? raw.aiTags.filter((t: unknown) => typeof t === 'string').slice(0, 8)
      : [],
    aiChapters: normalizeAiChapters(raw.aiChapters, payload.durationSeconds || 60),
  };
}

export interface VideoAssistantPayload {
  mode: 'video-qa' | 'studio';
  videoTitle?: string;
  videoDescription?: string;
  videoCategory?: string;
  duration?: number;
  videoFormat?: VideoFormat;
  aiSummary?: string;
  question: string;
  history?: Array<{ role: 'user' | 'assistant'; text: string }>;
  language: 'bn' | 'en';
}

export async function askBasharTubeAi(payload: VideoAssistantPayload): Promise<string> {
  const res = await fetch('/api/ai/video-assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || 'BasharTube AI request failed.');
  }

  return typeof data.reply === 'string' ? data.reply.trim() : '';
}

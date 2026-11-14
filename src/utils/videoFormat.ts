import { VideoFormat, VideoChapter, VideoItem } from '../types';

export interface VideoDimensionsAndDuration {
  width?: number;
  height?: number;
  durationSeconds?: number;
}

const DEMO_URL_SIGNATURES = [
  'ForBiggerBlazes',
  'BigBuckBunny',
  'ElephantsDream',
  'Sintel',
  'gtv-videos-bucket/sample',
  'mixkit.co/videos',
];

/**
 * Automatically classifies an uploaded video as 'short' or 'long'.
 * - Landscape videos (width > height * 1.15) are 'long'.
 * - Portrait or square videos up to 180s are 'short'; longer portrait videos (> 180s) are 'long'.
 * - When dimensions are unavailable, falls back to duration > 60s => 'long'.
 */
export function detectVideoFormat({
  width = 0,
  height = 0,
  durationSeconds = 0,
}: VideoDimensionsAndDuration): VideoFormat {
  if (width > 0 && height > 0) {
    const ratio = width / height;
    if (ratio > 1.15) {
      return 'long';
    }
    return durationSeconds > 180 ? 'long' : 'short';
  }
  return durationSeconds > 60 ? 'long' : 'short';
}

export function resolveVideoFormat(video: Partial<VideoItem>): VideoFormat {
  if (video.videoFormat === 'short' || video.videoFormat === 'long') {
    return video.videoFormat;
  }
  return detectVideoFormat({
    width: video.videoWidth,
    height: video.videoHeight,
    durationSeconds: video.duration,
  });
}

export function formatVideoDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return hrs > 0 ? `${hrs}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function parseTimestampToSeconds(timestamp: string): number {
  const parts = String(timestamp || '')
    .trim()
    .split(':')
    .map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n) || n < 0)) return 0;
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

export function normalizeAiChapters(
  rawChapters: Array<{ time?: string; seconds?: number; title?: string }> | undefined,
  maxDurationSeconds: number
): VideoChapter[] {
  if (!Array.isArray(rawChapters)) return [];
  const cap = Math.max(1, Math.floor(maxDurationSeconds || 3600));
  return rawChapters
    .filter((c) => c && typeof c.title === 'string' && c.title.trim().length > 0)
    .map((c) => {
      const parsedFromTime = c.time ? parseTimestampToSeconds(c.time) : 0;
      const rawSeconds =
        typeof c.seconds === 'number' && Number.isFinite(c.seconds) && c.seconds >= 0
          ? Math.floor(c.seconds)
          : parsedFromTime;
      const clampedSeconds = Math.min(Math.max(0, rawSeconds), cap);
      const timeLabel = c.time && /^\d{1,2}:\d{2}(:\d{2})?$/.test(c.time.trim())
        ? c.time.trim()
        : formatVideoDuration(clampedSeconds);
      return {
        time: timeLabel,
        seconds: clampedSeconds,
        title: c.title!.trim(),
      };
    })
    .slice(0, 8);
}

export function isValidRealVideoFile(file: {
  type?: string;
  name?: string;
  size?: number;
}): boolean {
  if (typeof file.size === 'number' && file.size <= 0) {
    return false;
  }
  const mime = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  const allowedMimes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'];
  const allowedExts = ['.mp4', '.webm', '.mov', '.m4v'];
  return (
    allowedMimes.some((m) => mime.includes(m)) ||
    allowedExts.some((ext) => name.endsWith(ext))
  );
}

export function isDemoOrFakeVideoUrl(url?: string): boolean {
  if (!url) return false;
  return DEMO_URL_SIGNATURES.some((sig) => url.includes(sig));
}

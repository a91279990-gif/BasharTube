import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectVideoFormat,
  formatVideoDuration,
  parseTimestampToSeconds,
  normalizeAiChapters,
  isValidRealVideoFile,
  isDemoOrFakeVideoUrl,
} from './videoFormat';

test('detectVideoFormat identifies landscape 16:9 video as long', () => {
  assert.equal(detectVideoFormat({ width: 1920, height: 1080, durationSeconds: 45 }), 'long');
  assert.equal(detectVideoFormat({ width: 1280, height: 720, durationSeconds: 320 }), 'long');
});

test('detectVideoFormat identifies portrait 9:16 video <= 180s as short and > 180s as long', () => {
  assert.equal(detectVideoFormat({ width: 1080, height: 1920, durationSeconds: 30 }), 'short');
  assert.equal(detectVideoFormat({ width: 720, height: 1280, durationSeconds: 180 }), 'short');
  assert.equal(detectVideoFormat({ width: 1080, height: 1920, durationSeconds: 240 }), 'long');
});

test('detectVideoFormat falls back cleanly when dimensions are missing', () => {
  assert.equal(detectVideoFormat({ durationSeconds: 59 }), 'short');
  assert.equal(detectVideoFormat({ durationSeconds: 61 }), 'long');
});

test('formatVideoDuration formats seconds into MM:SS and HH:MM:SS', () => {
  assert.equal(formatVideoDuration(0), '00:00');
  assert.equal(formatVideoDuration(65), '01:05');
  assert.equal(formatVideoDuration(3661), '1:01:01');
});

test('parseTimestampToSeconds parses mm:ss and hh:mm:ss timestamps', () => {
  assert.equal(parseTimestampToSeconds('00:45'), 45);
  assert.equal(parseTimestampToSeconds('02:15'), 135);
  assert.equal(parseTimestampToSeconds('1:02:05'), 3725);
});

test('normalizeAiChapters clamps timestamps within video duration and strips empty items', () => {
  const chapters = normalizeAiChapters(
    [
      { time: '00:00', title: 'Intro' },
      { time: '05:00', seconds: 300, title: 'Clamped Beyond End' },
      { time: '00:20', title: '   ' },
    ],
    120
  );
  assert.equal(chapters.length, 2);
  assert.equal(chapters[0].seconds, 0);
  assert.equal(chapters[1].seconds, 120);
});

test('isValidRealVideoFile accepts real MP4/WebM/MOV files and rejects empty files', () => {
  assert.equal(isValidRealVideoFile({ name: 'vlog.mp4', type: 'video/mp4', size: 1024 }), true);
  assert.equal(isValidRealVideoFile({ name: 'clip.webm', type: 'video/webm', size: 512 }), true);
  assert.equal(isValidRealVideoFile({ name: 'fake.mp4', type: 'video/mp4', size: 0 }), false);
  assert.equal(isValidRealVideoFile({ name: 'photo.png', type: 'image/png', size: 1024 }), false);
});

test('isDemoOrFakeVideoUrl flags known demo sample clips', () => {
  assert.equal(
    isDemoOrFakeVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'),
    true
  );
  assert.equal(isDemoOrFakeVideoUrl('blob:http://localhost:3000/1234-5678'), false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isPlayableVideoUrl,
  sanitizeStoredVideos,
  mergeRemoteVideosWithLocalMedia,
  filterHomeFeedVideos,
  resolveActiveVideoId,
} from './videoFeedSync.ts';
import type { VideoItem } from '../types/index.ts';

function makeVideo(overrides: Partial<VideoItem> = {}): VideoItem {
  return {
    id: overrides.id ?? 'vid_1',
    authorId: overrides.authorId ?? 'user_1',
    authorName: overrides.authorName ?? 'Bashar Creator',
    authorUsername: overrides.authorUsername ?? 'bashar',
    authorAvatar: overrides.authorAvatar ?? 'https://example.com/avatar.png',
    isAuthorVerified: false,
    title: overrides.title ?? 'Test Video',
    description: overrides.description ?? 'Test Description',
    videoUrl: overrides.videoUrl ?? '/api/videos/stream/vid_1.mp4',
    thumbnailUrl: overrides.thumbnailUrl ?? '',
    duration: overrides.duration ?? 20,
    videoFormat: overrides.videoFormat ?? 'short',
    category: overrides.category ?? 'Entertainment',
    visibility: overrides.visibility ?? 'public',
    viewsCount: overrides.viewsCount ?? 1,
    likesCount: overrides.likesCount ?? 0,
    sharesCount: overrides.sharesCount ?? 0,
    commentsCount: overrides.commentsCount ?? 0,
    commentsEnabled: true,
    hasSubtitles: false,
    aiModerationStatus: 'approved',
    isKidsSafe: false,
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

test('isPlayableVideoUrl rejects empty and demo URLs and accepts stream/blob/https', () => {
  assert.equal(isPlayableVideoUrl(''), false);
  assert.equal(isPlayableVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'), false);
  assert.equal(isPlayableVideoUrl('/api/videos/stream/abc.mp4'), true);
  assert.equal(isPlayableVideoUrl('blob:http://localhost:3000/1234'), true);
  assert.equal(isPlayableVideoUrl('https://cdn.example.com/video.mp4'), true);
});

test('sanitizeStoredVideos strips dead persisted blob URLs and marks hasStoredBlob', () => {
  const input = [
    makeVideo({ id: 'a', videoUrl: 'blob:http://localhost:3000/dead' }),
    makeVideo({ id: 'b', videoUrl: '/api/videos/stream/b.mp4' }),
    makeVideo({ id: 'c', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' }),
  ];
  const res = sanitizeStoredVideos(input);
  assert.equal(res.length, 2);
  assert.equal(res[0].id, 'a');
  assert.equal(res[0].videoUrl, '');
  assert.equal(res[0].hasStoredBlob, true);
  assert.equal(res[1].videoUrl, '/api/videos/stream/b.mp4');
});

test('mergeRemoteVideosWithLocalMedia never clobbers an active local blob URL or pending upload', () => {
  const localMap = new Map<string, string>([
    ['vid_local', 'blob:http://localhost:3000/live-blob'],
    ['vid_pending', 'blob:http://localhost:3000/pending-blob'],
  ]);
  const pendingSet = new Set(['vid_pending']);

  const prev = [
    makeVideo({ id: 'vid_pending', videoUrl: 'blob:http://localhost:3000/pending-blob', videoFormat: 'long' }),
    makeVideo({ id: 'vid_local', videoUrl: 'blob:http://localhost:3000/live-blob', videoFormat: 'short' }),
  ];

  // Snapshot returns vid_local with empty videoUrl because Firestore doc omitted blob URL
  const remote = [
    makeVideo({ id: 'vid_local', videoUrl: '', hasStoredBlob: true, videoFormat: 'short' }),
  ];

  const merged = mergeRemoteVideosWithLocalMedia(remote, prev, localMap, pendingSet);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, 'vid_pending');
  assert.equal(merged[0].videoUrl, 'blob:http://localhost:3000/pending-blob');
  assert.equal(merged[1].id, 'vid_local');
  assert.equal(merged[1].videoUrl, 'blob:http://localhost:3000/live-blob');
});

test('mergeRemoteVideosWithLocalMedia upgrades to persistent /api/videos/stream URL when Firestore receives it', () => {
  const localMap = new Map<string, string>([
    ['vid_1', 'blob:http://localhost:3000/live-blob'],
  ]);
  const prev = [makeVideo({ id: 'vid_1', videoUrl: 'blob:http://localhost:3000/live-blob' })];
  const remote = [makeVideo({ id: 'vid_1', videoUrl: '/api/videos/stream/vid_1.mp4' })];

  const merged = mergeRemoteVideosWithLocalMedia(remote, prev, localMap);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].videoUrl, '/api/videos/stream/vid_1.mp4');
});

test('filterHomeFeedVideos strictly separates Short and Long playable videos', () => {
  const shortVid = makeVideo({ id: 's1', videoFormat: 'short', videoUrl: '/api/videos/stream/s1.mp4' });
  const longVid = makeVideo({ id: 'l1', videoFormat: 'long', videoUrl: '/api/videos/stream/l1.mp4', videoWidth: 1280, videoHeight: 720, duration: 95 });
  const unplayable = makeVideo({ id: 'u1', videoUrl: '' });

  const baseOpts = {
    activeFeed: 'foryou' as const,
    formatFilter: 'short' as const,
    currentUserId: 'user_1',
    isSuperAdmin: false,
    followedCreatorIds: new Set<string>(),
    blockedUserIds: [],
    dontRecommendCreatorIds: [],
  };

  assert.deepEqual(
    filterHomeFeedVideos([shortVid, longVid, unplayable], baseOpts).map((v) => v.id),
    ['s1']
  );
  assert.deepEqual(
    filterHomeFeedVideos([shortVid, longVid, unplayable], { ...baseOpts, formatFilter: 'long' }).map((v) => v.id),
    ['l1']
  );
});

test('resolveActiveVideoId selects preferred playable video or falls back to first playable', () => {
  const videos = [makeVideo({ id: 'v1' }), makeVideo({ id: 'v2' })];
  assert.equal(resolveActiveVideoId(videos, 'v2'), 'v2');
  assert.equal(resolveActiveVideoId(videos, 'missing'), 'v1');
  assert.equal(resolveActiveVideoId([], 'v1'), null);
});

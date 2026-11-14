import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCreatorAnalytics,
  formatWebsiteUrl,
  generateDefaultAvatarDataUrl,
  mergeUserDirectories,
  propagateProfileToComments,
  propagateProfileToReplies,
  propagateProfileToVideos,
} from './profileSync';
import { CommentItem, CommentReply, UserProfile, VideoItem } from '../types';

const makeUser = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: 'usr_1',
  email: 'tanvir@gmail.com',
  username: 'tanvir_bd',
  handle: '@tanvir_bd',
  displayName: 'তানভীর আহমেদ',
  channelName: 'তানভীর স্টুডিও',
  bio: 'অরিজিনাল কন্টেন্ট',
  avatarUrl: 'data:image/webp;base64,oldlogo',
  websiteUrl: '',
  role: 'creator',
  isVerified: false,
  isKidsAccount: false,
  followersCount: 0,
  followingCount: 0,
  totalViews: 0,
  totalLikes: 0,
  totalShares: 0,
  isSuspended: false,
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

test('formatWebsiteUrl normalizes missing protocol cleanly and preserves empty strings', () => {
  assert.equal(formatWebsiteUrl(''), '');
  assert.equal(formatWebsiteUrl('   '), '');
  assert.equal(formatWebsiteUrl('bashartube.bd'), 'https://bashartube.bd');
  assert.equal(formatWebsiteUrl('http://example.com'), 'http://example.com');
  assert.equal(formatWebsiteUrl('https://creator.bd/page'), 'https://creator.bd/page');
});

test('generateDefaultAvatarDataUrl returns an inline SVG data URI', () => {
  const uri = generateDefaultAvatarDataUrl('Bashar', 'bashar');
  assert.ok(uri.startsWith('data:image/svg+xml;utf8,'));
  assert.ok(uri.includes('B'));
});

test('mergeUserDirectories merges Firestore and local accounts while preserving freshest edits and password', () => {
  const local = [
    makeUser({
      id: 'usr_1',
      password: 'secret123',
      displayName: 'Old Name',
      updatedAt: '2026-01-02T00:00:00Z',
    }),
    makeUser({
      id: 'usr_local_only',
      username: 'local_only',
      handle: '@local_only',
      email: 'local@gmail.com',
    }),
  ];
  const remote = [
    makeUser({
      id: 'usr_1',
      password: '',
      displayName: 'নতুন আপডেটেড নাম',
      channelName: 'নতুন চ্যানেল',
      handle: '@new_handle_bd',
      username: 'new_handle_bd',
      updatedAt: '2026-02-01T00:00:00Z',
    }),
    makeUser({
      id: 'usr_remote_only',
      username: 'remote_creator',
      handle: '@remote_creator',
      email: 'remote@gmail.com',
    }),
  ];

  const merged = mergeUserDirectories(remote, local);
  assert.equal(merged.length, 3);
  const updatedU1 = merged.find((u) => u.id === 'usr_1');
  assert.equal(updatedU1?.displayName, 'নতুন আপডেটেড নাম');
  assert.equal(updatedU1?.channelName, 'নতুন চ্যানেল');
  assert.equal(updatedU1?.handle, '@new_handle_bd');
  assert.equal(updatedU1?.password, 'secret123');
});

test('propagateProfileToVideos updates channel name, handle/username, avatar on creator videos only', () => {
  const updatedUser = makeUser({
    id: 'usr_1',
    displayName: 'নতুন নাম',
    channelName: 'নতুন চ্যানেল প্রো',
    username: 'pro_creator',
    handle: '@pro_creator',
    avatarUrl: 'data:image/webp;base64,newlogo',
    isVerified: true,
  });

  const videos: VideoItem[] = [
    {
      id: 'v1',
      authorId: 'usr_1',
      authorName: 'পুরোনো চ্যানেল',
      authorUsername: 'old_handle',
      authorAvatar: 'old_avatar',
      isAuthorVerified: false,
      title: 'My Short',
      description: '',
      videoUrl: '/api/videos/stream/v1.mp4',
      thumbnailUrl: '',
      duration: 20,
      videoFormat: 'short',
      category: 'Entertainment',
      visibility: 'public',
      viewsCount: 12,
      likesCount: 3,
      sharesCount: 1,
      commentsCount: 0,
      commentsEnabled: true,
      hasSubtitles: false,
      aiModerationStatus: 'approved',
      isKidsSafe: false,
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'v2',
      authorId: 'usr_other',
      authorName: 'Other Creator',
      authorUsername: 'other_user',
      authorAvatar: 'other_avatar',
      isAuthorVerified: false,
      title: 'Other Video',
      description: '',
      videoUrl: '/api/videos/stream/v2.mp4',
      thumbnailUrl: '',
      duration: 180,
      videoFormat: 'long',
      category: 'Education',
      visibility: 'public',
      viewsCount: 5,
      likesCount: 1,
      sharesCount: 0,
      commentsCount: 0,
      commentsEnabled: true,
      hasSubtitles: false,
      aiModerationStatus: 'approved',
      isKidsSafe: false,
      createdAt: '2026-01-01T00:00:00Z',
    },
  ];

  const synced = propagateProfileToVideos(videos, updatedUser);
  assert.equal(synced[0].authorName, 'নতুন চ্যানেল প্রো');
  assert.equal(synced[0].authorUsername, 'pro_creator');
  assert.equal(synced[0].authorAvatar, 'data:image/webp;base64,newlogo');
  assert.equal(synced[0].isAuthorVerified, true);

  assert.equal(synced[1].authorName, 'Other Creator');
  assert.equal(synced[1].authorUsername, 'other_user');
});

test('propagateProfileToComments and Replies syncs updated profile info', () => {
  const updatedUser = makeUser({
    id: 'usr_1',
    displayName: 'Updated Display Name',
    username: 'updated_handle',
    avatarUrl: 'data:image/webp;base64,updated',
    isVerified: true,
  });

  const comments: CommentItem[] = [
    {
      id: 'c1',
      videoId: 'v1',
      authorId: 'usr_1',
      authorName: 'Old Name',
      authorUsername: 'old',
      authorAvatar: 'old',
      isAuthorVerified: false,
      text: 'Nice video',
      isEdited: false,
      isPinned: false,
      hasCreatorHeart: false,
      likesCount: 0,
      repliesCount: 1,
      reactions: { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
      aiModerationStatus: 'approved',
      createdAt: '',
    },
  ];
  const replies: Record<string, CommentReply[]> = {
    c1: [
      {
        id: 'r1',
        commentId: 'c1',
        videoId: 'v1',
        authorId: 'usr_1',
        authorName: 'Old Name',
        authorUsername: 'old',
        authorAvatar: 'old',
        text: 'Thanks',
        isEdited: false,
        createdAt: '',
      },
    ],
  };

  const nextComments = propagateProfileToComments(comments, updatedUser);
  const nextReplies = propagateProfileToReplies(replies, updatedUser);
  assert.equal(nextComments[0].authorName, 'Updated Display Name');
  assert.equal(nextComments[0].authorUsername, 'updated_handle');
  assert.equal(nextComments[0].isAuthorVerified, true);
  assert.equal(nextReplies.c1[0].authorName, 'Updated Display Name');
  assert.equal(nextReplies.c1[0].authorUsername, 'updated_handle');
});

test('computeCreatorAnalytics returns strictly real zero-fake-data breakdown', () => {
  const emptyStats = computeCreatorAnalytics([]);
  assert.equal(emptyStats.totalVideos, 0);
  assert.equal(emptyStats.totalViews, 0);
  assert.equal(emptyStats.topVideos.length, 0);

  const stats = computeCreatorAnalytics([
    {
      id: 'v1',
      authorId: 'u1',
      authorName: 'A',
      authorUsername: 'a',
      authorAvatar: '',
      isAuthorVerified: false,
      title: 'Short 1',
      description: '',
      videoUrl: 'x.mp4',
      thumbnailUrl: '',
      duration: 25,
      videoFormat: 'short',
      category: 'Travel',
      visibility: 'public',
      viewsCount: 100,
      likesCount: 20,
      sharesCount: 5,
      commentsCount: 5,
      commentsEnabled: true,
      hasSubtitles: false,
      aiModerationStatus: 'approved',
      isKidsSafe: false,
      createdAt: '',
    },
    {
      id: 'v2',
      authorId: 'u1',
      authorName: 'A',
      authorUsername: 'a',
      authorAvatar: '',
      isAuthorVerified: false,
      title: 'Long 1',
      description: '',
      videoUrl: 'y.mp4',
      thumbnailUrl: '',
      duration: 200,
      videoFormat: 'long',
      category: 'Education',
      visibility: 'public',
      viewsCount: 300,
      likesCount: 40,
      sharesCount: 10,
      commentsCount: 10,
      commentsEnabled: true,
      hasSubtitles: false,
      aiModerationStatus: 'approved',
      isKidsSafe: false,
      createdAt: '',
    },
  ]);

  assert.equal(stats.totalVideos, 2);
  assert.equal(stats.shortVideos, 1);
  assert.equal(stats.longVideos, 1);
  assert.equal(stats.totalViews, 400);
  assert.equal(stats.totalLikes, 60);
  assert.equal(stats.topVideos[0].id, 'v2');
  assert.equal(stats.topVideos[0].relativeScalePercent, 100);
});

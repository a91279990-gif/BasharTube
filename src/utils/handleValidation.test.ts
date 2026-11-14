import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  normalizeHandle, 
  validateHandleFormat, 
  checkHandleCollision, 
  generateHandleSuggestions 
} from './handleValidation';
import { UserProfile } from '../types';

test('normalizeHandle automatically adds @ prefix, converts to lowercase, and strips invalid characters', () => {
  assert.equal(normalizeHandle('BasharPro'), '@basharpro');
  assert.equal(normalizeHandle('@Tanvir_Vlogs'), '@tanvir_vlogs');
  assert.equal(normalizeHandle('@@creator##123'), '@creator_123');
  assert.equal(normalizeHandle(''), '');
});

test('validateHandleFormat enforces @ prefix and length rules', () => {
  assert.equal(validateHandleFormat('no_at').isValid, false);
  assert.equal(validateHandleFormat('@ab').isValid, false); // too short
  assert.equal(validateHandleFormat('@valid_handle123').isValid, true);
  assert.equal(validateHandleFormat('@.invalid_start').isValid, false);
});

test('checkHandleCollision detects duplicate handles and usernames', () => {
  const users: UserProfile[] = [
    {
      id: 'u1',
      email: 'creator@gmail.com',
      username: 'bd_explorer',
      displayName: 'Explorer',
      bio: '',
      avatarUrl: '',
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
      createdAt: '',
      handle: '@bd_explorer'
    }
  ];

  // Identical handle should collide
  assert.equal(checkHandleCollision('@bd_explorer', users), true);
  assert.equal(checkHandleCollision('@BD_EXPLORER', users), true);
  assert.equal(checkHandleCollision('bd_explorer', users), true);

  // Different handle should not collide
  assert.equal(checkHandleCollision('@bd_traveler', users), false);

  // Same user updating own handle should not collide
  assert.equal(checkHandleCollision('@bd_explorer', users, 'u1'), false);
});

test('generateHandleSuggestions provides unique alternatives', () => {
  const users: UserProfile[] = [
    {
      id: 'u1',
      email: 'test@gmail.com',
      username: 'bashar',
      displayName: 'Bashar',
      bio: '',
      avatarUrl: '',
      websiteUrl: '',
      role: 'user',
      isVerified: false,
      isKidsAccount: false,
      followersCount: 0,
      followingCount: 0,
      totalViews: 0,
      totalLikes: 0,
      totalShares: 0,
      isSuspended: false,
      createdAt: '',
      handle: '@bashar'
    }
  ];

  const suggestions = generateHandleSuggestions('@bashar', users);
  assert.ok(suggestions.length > 0);
  assert.ok(suggestions.every(s => s.startsWith('@')));
  assert.ok(suggestions.every(s => s !== '@bashar'));
});

test('identical displayName and channelName are allowed as long as @handle is unique', () => {
  const existingUsers: UserProfile[] = [
    {
      id: 'u1',
      email: 'a@gmail.com',
      username: 'tanvir_one',
      handle: '@tanvir_one',
      displayName: 'তানভীর আহমেদ',
      channelName: 'বাংলা ক্রিয়েটর স্টুডিও',
      bio: '',
      avatarUrl: '',
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
      createdAt: '',
    }
  ];

  // Different user using exact same displayName & channelName with a unique @handle -> allowed!
  assert.equal(checkHandleCollision('@tanvir_two', existingUsers), false);
  // Trying to copy @tanvir_one -> strictly blocked!
  assert.equal(checkHandleCollision('@tanvir_one', existingUsers), true);
  assert.equal(checkHandleCollision('@TANVIR_ONE', existingUsers), true);
});


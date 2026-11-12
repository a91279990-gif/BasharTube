/**
 * Handle Validation & Uniqueness Utilities for BasharTube
 * Enforces @ prefix, format rules, duplicate prevention, and smart suggestions
 */

import { UserProfile } from '../types';

/**
 * Normalizes any input handle to start with '@', lowercase, and stripped whitespace
 */
export function normalizeHandle(input: string): string {
  if (!input) return '';
  let clean = input.trim().toLowerCase();
  // Strip duplicate leading @@
  clean = clean.replace(/^@+/, '');
  // Replace invalid characters with underscore
  clean = clean.replace(/[^a-z0-9_.]/g, '_');
  // Collapse multiple underscores
  clean = clean.replace(/_+/g, '_');
  return clean ? `@${clean}` : '';
}

/**
 * Validates handle format:
 * - Must start with '@'
 * - Identifier part must be between 3 and 30 characters
 * - Only alphanumeric characters, underscores, and periods
 */
export function validateHandleFormat(handle: string): { isValid: boolean; error?: string } {
  if (!handle) {
    return { isValid: false, error: 'হ্যান্ডেল আবশ্যক। অনুগ্রহ করে একটি ইউনিক হ্যান্ডেল লিখুন।' };
  }

  if (!handle.startsWith('@')) {
    return { isValid: false, error: 'হ্যান্ডেলের প্রথমে অবশ্যই @ থাকতে হবে।' };
  }

  const identifier = handle.slice(1);

  if (identifier.length < 3) {
    return { isValid: false, error: 'হ্যান্ডেল অন্তত ৩ অক্ষরের হতে হবে (@ এর পর)।' };
  }

  if (identifier.length > 30) {
    return { isValid: false, error: 'হ্যান্ডেল সর্বোচ্চ ৩০ অক্ষরের হতে পারে।' };
  }

  const regex = /^[a-z0-9_.]+$/;
  if (!regex.test(identifier)) {
    return { isValid: false, error: 'হ্যান্ডেলে শুধুমাত্র ইংরেজি বর্ণ, সংখ্যা, আন্ডারস্কোর (_) এবং ডট (.) ব্যবহার করা যাবে।' };
  }

  if (/^[._]/.test(identifier) || /[._]$/.test(identifier)) {
    return { isValid: false, error: 'হ্যান্ডেলের শুরুতে বা শেষে ডট বা আন্ডারস্কোর রাখা যাবে না।' };
  }

  return { isValid: true };
}

/**
 * Checks if a handle is already taken by any existing user
 */
export function checkHandleCollision(
  handle: string, 
  existingUsers: UserProfile[], 
  currentUserId?: string
): boolean {
  const normalized = normalizeHandle(handle);
  const identifier = normalized.slice(1);

  return existingUsers.some(u => {
    if (currentUserId && u.id === currentUserId) return false;
    const existingHandle = u.handle ? normalizeHandle(u.handle) : `@${u.username.toLowerCase()}`;
    const existingUsername = u.username.toLowerCase();
    return existingHandle === normalized || existingUsername === identifier;
  });
}

/**
 * Generates alternative suggestions if a handle is already taken
 */
export function generateHandleSuggestions(
  baseHandle: string, 
  existingUsers: UserProfile[]
): string[] {
  const normalized = normalizeHandle(baseHandle);
  const raw = normalized.slice(1);
  const year = new Date().getFullYear();

  const candidates = [
    `@${raw}_official`,
    `@${raw}_bd`,
    `@${raw}${year}`,
    `@real_${raw}`,
    `@${raw}_creator`,
    `@${raw}_tube`
  ];

  return candidates.filter(cand => !checkHandleCollision(cand, existingUsers)).slice(0, 3);
}

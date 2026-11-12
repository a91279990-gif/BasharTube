/**
 * Pure security utilities for BasharTube session management and security questions
 */

import { UserSession } from '../types';

/**
 * Normalizes security answer for constant-time comparison
 */
export function normalizeSecurityAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Verifies security answer against stored hash/answer
 */
export function verifySecurityAnswer(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  return normalizeSecurityAnswer(provided) === normalizeSecurityAnswer(expected);
}

/**
 * Invalidates a specific session from session list by ID
 */
export function invalidateSession(sessions: UserSession[], sessionIdToInvalidate: string): {
  updatedSessions: UserSession[];
  invalidatedSession: UserSession | null;
} {
  const target = sessions.find(s => s.id === sessionIdToInvalidate);
  if (!target) {
    return { updatedSessions: sessions, invalidatedSession: null };
  }

  const updatedSessions = sessions.filter(s => s.id !== sessionIdToInvalidate);
  const invalidatedSession: UserSession = {
    ...target,
    tokenStatus: 'revoked'
  };

  return { updatedSessions, invalidatedSession };
}

/**
 * Checks if a session has an active valid token
 */
export function isSessionActive(session: UserSession): boolean {
  if (session.tokenStatus === 'revoked') return false;
  if (session.tokenExpiresAt) {
    const expiry = new Date(session.tokenExpiresAt).getTime();
    if (Date.now() > expiry) return false;
  }
  return true;
}

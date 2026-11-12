import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  normalizeSecurityAnswer, 
  verifySecurityAnswer, 
  invalidateSession, 
  isSessionActive 
} from './sessionSecurity';
import { UserSession } from '../types';

test('normalizeSecurityAnswer strips extra spaces and lowercases', () => {
  assert.equal(normalizeSecurityAnswer('  Dhaka   City '), 'dhaka city');
  assert.equal(normalizeSecurityAnswer('DHAKA'), 'dhaka');
});

test('verifySecurityAnswer accurately matches answers ignoring casing and spacing', () => {
  assert.equal(verifySecurityAnswer('Chittagong', 'chittagong'), true);
  assert.equal(verifySecurityAnswer('  Sylhet  ', 'sylhet'), true);
  assert.equal(verifySecurityAnswer('Wrong Answer', 'Correct Answer'), false);
  assert.equal(verifySecurityAnswer('', 'Correct Answer'), false);
});

test('invalidateSession removes target session and marks token as revoked', () => {
  const sessions: UserSession[] = [
    {
      id: 'sess_1',
      deviceName: 'Chrome on macOS',
      deviceType: 'desktop',
      browser: 'Chrome 128',
      os: 'macOS',
      ip: '103.205.71.1',
      ipAddress: '103.205.71.1',
      lastActive: new Date().toISOString(),
      loginAt: new Date().toISOString(),
      isCurrent: true,
      tokenStatus: 'active'
    },
    {
      id: 'sess_2',
      deviceName: 'BasharTube App on Galaxy S24',
      deviceType: 'mobile',
      browser: 'Mobile Safari',
      os: 'Android 14',
      ip: '103.205.71.25',
      ipAddress: '103.205.71.25',
      lastActive: new Date().toISOString(),
      loginAt: new Date().toISOString(),
      isCurrent: false,
      tokenStatus: 'active'
    }
  ];

  const { updatedSessions, invalidatedSession } = invalidateSession(sessions, 'sess_2');

  assert.equal(updatedSessions.length, 1);
  assert.equal(updatedSessions[0].id, 'sess_1');
  assert.notEqual(invalidatedSession, null);
  assert.equal(invalidatedSession?.tokenStatus, 'revoked');
});

test('isSessionActive returns false for revoked tokens', () => {
  const activeSess: UserSession = {
    id: 's_act',
    deviceName: 'Desktop',
    browser: 'Chrome',
    os: 'Windows',
    ip: '1.1.1.1',
    lastActive: new Date().toISOString(),
    isCurrent: true,
    tokenStatus: 'active'
  };
  const revokedSess: UserSession = {
    id: 's_rev',
    deviceName: 'Mobile',
    browser: 'Safari',
    os: 'iOS',
    ip: '1.1.1.2',
    lastActive: new Date().toISOString(),
    isCurrent: false,
    tokenStatus: 'revoked'
  };

  assert.equal(isSessionActive(activeSess), true);
  assert.equal(isSessionActive(revokedSess), false);
});

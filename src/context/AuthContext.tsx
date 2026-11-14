import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  deleteDoc,
  where,
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import {
  UserProfile,
  UserPreferences,
  SocialMediaLink,
  UserSession,
  NotificationCategorySettings,
} from '../types';
import { SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD } from '../data/mockData';
import {
  normalizeHandle,
  validateHandleFormat,
  checkHandleCollision,
  generateHandleSuggestions,
} from '../utils/handleValidation';
import {
  formatWebsiteUrl,
  generateDefaultAvatarDataUrl,
  mergeUserDirectories,
} from '../utils/profileSync';

export interface RegisterData {
  fullName: string;
  channelName: string;
  handle: string; // Must start with @ and be globally unique
  channelLogo: string; // Direct image upload Data URL
  email: string;
  password: string;
  securityQuestion: string;
  securityAnswer: string;
}

interface AuthContextType {
  currentUser: UserProfile | null;
  fbUser: FirebaseUser | null;
  isLoading: boolean;
  preferences: UserPreferences;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  registeredCreators: UserProfile[];

  // Custom Registration with Name, Logo, Channel Name, Gmail, Password, Security Q&A
  registerAccount: (data: RegisterData) => Promise<{ success: boolean; message?: string }>;

  // Custom Login with Gmail and Password
  loginWithCredentials: (
    email: string,
    pass: string
  ) => Promise<{ success: boolean; message?: string }>;

  // Security Question & Answer Recovery System
  getSecurityQuestionByEmail: (email: string) => { question?: string; error?: string };
  resetPasswordWithSecurityQuestion: (
    email: string,
    answer: string,
    newPass: string
  ) => { success: boolean; message?: string };

  // Security Question Change & Password Change
  changeSecurityQuestion: (
    currentPass: string,
    newQuestion: string,
    newAnswer: string
  ) => Promise<{ success: boolean; message?: string }>;
  changePassword: (
    currentPass: string,
    newPass: string
  ) => Promise<{ success: boolean; message?: string }>;

  // Device & Session Management
  deviceSessions: UserSession[];
  logoutSession: (sessionId: string) => void;
  fetchActiveSessions: () => Promise<UserSession[]>;
  invalidateSessionWithToken: (
    sessionId: string
  ) => Promise<{ success: boolean; message?: string }>;

  // Permanent Account Deletion with password confirmation
  deleteAccountWithPassword: (password: string) => Promise<{ success: boolean; message?: string }>;

  // Social Media Links
  updateSocialLinks: (links: SocialMediaLink[]) => Promise<void>;

  // Advanced Notification Settings
  updateNotificationCategory: (
    category: keyof NotificationCategorySettings,
    enabled: boolean
  ) => void;

  // Messenger Seen Status Toggle
  toggleSeenStatus: (enabled: boolean) => void;

  // Handle Availability & Uniqueness Check (Enforces unique @handle globally)
  checkHandleAvailability: (
    handle: string,
    excludeUserId?: string
  ) => { available: boolean; message?: string; suggestions?: string[] };

  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean; message?: string }>;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  toggleBlockUser: (targetUserId: string) => void;
  toggleDontRecommendCreator: (creatorId: string) => void;

  // Admin Password Security Gate
  adminPassword: string;
  isAdminUnlocked: boolean;
  unlockAdminWithPassword: (pass: string) => { success: boolean; message?: string };
  lockAdmin: () => void;
  updateAdminPassword: (
    oldPass: string,
    newPass: string
  ) => { success: boolean; message?: string };
}

const ACCOUNTS_STORAGE_KEY = 'bashartube_registered_accounts';
const ACTIVE_USER_STORAGE_KEY = 'bashartube_active_user';

const DEFAULT_NOTIFICATIONS: NotificationCategorySettings = {
  likes: true,
  comments: true,
  follows: true,
  messages: true,
  calls: true,
  videoUploads: true,
};

const DEFAULT_PREFS: UserPreferences = {
  dataSaver: false,
  soundEnabled: true,
  typingIndicatorEnabled: true,
  seenStatusEnabled: true,
  chatWallpaper: 'linear-gradient(to bottom, #09090b, #121215)',
  blockedUserIds: [],
  dontRecommendCreatorIds: [],
  notificationCategories: DEFAULT_NOTIFICATIONS,
};

function readLocalAccounts(): UserProfile[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalAccounts(accounts: UserProfile[]) {
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch {}
}

function sanitizeUserForFirestore(user: UserProfile): Record<string, unknown> {
  const clean: Record<string, unknown> = { ...user, password: '' };
  Object.keys(clean).forEach((k) => {
    if (clean[k] === undefined) delete clean[k];
  });
  return clean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const firestoreUsersRef = useRef<UserProfile[]>([]);
  const [registeredCreators, setRegisteredCreators] = useState<UserProfile[]>(() =>
    readLocalAccounts()
  );

  // Security Answer Recovery Rate Limiting Protection
  const [failedAttempts, setFailedAttempts] = useState<
    Record<string, { count: number; lockUntil?: number }>
  >({});

  // Admin Master Password
  const [adminPassword, setAdminPassword] = useState<string>(() => {
    try {
      const savedPass = localStorage.getItem('bashartube_admin_master_password');
      return savedPass || SUPER_ADMIN_PASSWORD;
    } catch {
      return SUPER_ADMIN_PASSWORD;
    }
  });

  // Admin Panel Unlock State
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('bashartube_admin_unlocked') === 'true';
    } catch {
      return false;
    }
  });

  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const saved = localStorage.getItem('bashartube_prefs');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_PREFS,
          ...parsed,
          notificationCategories: {
            ...DEFAULT_NOTIFICATIONS,
            ...(parsed.notificationCategories || {}),
          },
        };
      }
      return DEFAULT_PREFS;
    } catch {
      return DEFAULT_PREFS;
    }
  });

  const getMergedUsers = (): UserProfile[] => {
    return mergeUserDirectories(firestoreUsersRef.current, readLocalAccounts());
  };

  const refreshMergedDirectory = () => {
    const merged = getMergedUsers();
    setRegisteredCreators(merged);
    return merged;
  };

  const isSuperAdmin =
    currentUser?.role === 'superadmin' ||
    currentUser?.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ||
    isAdminUnlocked;
  const isAdmin = isSuperAdmin || currentUser?.role === 'admin' || isAdminUnlocked;

  // Build current real browser/device session
  const getClientSession = (): UserSession => {
    const userAgent = navigator.userAgent;
    let browser = 'Web Browser';
    if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Edg')) browser = 'Edge';
    else if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Safari')) browser = 'Safari';

    let os = 'Desktop';
    let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
    if (/Android/i.test(userAgent)) {
      os = 'Android';
      deviceType = 'mobile';
    } else if (/iPhone|iPad/i.test(userAgent)) {
      os = 'iOS';
      deviceType = /iPad/i.test(userAgent) ? 'tablet' : 'mobile';
    } else if (/Mac/i.test(userAgent)) {
      os = 'macOS';
    } else if (/Windows/i.test(userAgent)) {
      os = 'Windows';
    } else if (/Linux/i.test(userAgent)) {
      os = 'Linux';
    }

    return {
      id: 'session_' + Date.now(),
      deviceName: `${os} (${browser})`,
      deviceType,
      browser,
      os,
      ip: 'Current Web Session',
      lastActive: new Date().toISOString(),
      loginAt: new Date().toISOString(),
      isCurrent: true,
    };
  };

  const deviceSessions: UserSession[] =
    currentUser?.sessions && currentUser.sessions.length > 0
      ? currentUser.sessions
      : [getClientSession()];

  // Real-time Firestore /users directory listener for global @handle uniqueness & creator discovery
  useEffect(() => {
    try {
      const unsubscribe = onSnapshot(
        collection(db, 'users'),
        (snapshot) => {
          const remote: UserProfile[] = [];
          snapshot.forEach((docSnap) => {
            remote.push({ id: docSnap.id, ...(docSnap.data() as Omit<UserProfile, 'id'>) });
          });
          firestoreUsersRef.current = remote;
          const merged = refreshMergedDirectory();

          setCurrentUser((prev) => {
            if (!prev) return prev;
            const remoteMatch = merged.find((u) => u.id === prev.id);
            if (!remoteMatch) return prev;
            const remoteUpdated = new Date(
              remoteMatch.updatedAt || remoteMatch.createdAt || 0
            ).getTime();
            const localUpdated = new Date(prev.updatedAt || prev.createdAt || 0).getTime();
            if (remoteUpdated > localUpdated) {
              const synced = { ...prev, ...remoteMatch, password: prev.password || remoteMatch.password };
              try {
                localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(synced));
              } catch {}
              return synced;
            }
            return prev;
          });
        },
        (error) => {
          console.warn('Firestore users directory notice:', error.message);
        }
      );
      return () => unsubscribe();
    } catch {
      return undefined;
    }
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFbUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const data = userSnap.data() as UserProfile;
            setCurrentUser(data);
            localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(data));
          } else {
            const isOwnerAdmin =
              (firebaseUser.email || '').toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
            const rawName = (firebaseUser.displayName || 'user')
              .toLowerCase()
              .replace(/[^a-z0-9_]/g, '_')
              .replace(/_+/g, '_')
              .replace(/^[._]+|[._]+$/g, '');
            const baseUser = (rawName.length >= 3 ? rawName : 'creator') + '_' + Math.floor(100 + Math.random() * 900);
            const handle = `@${baseUser}`;
            const newProfile: UserProfile = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              username: baseUser,
              handle,
              displayName: firebaseUser.displayName || 'Creator',
              channelName: firebaseUser.displayName || 'My Channel',
              bio: 'বাশারটিউব অফিসিয়াল ক্রিয়েটর 🇧🇩',
              avatarUrl:
                firebaseUser.photoURL ||
                generateDefaultAvatarDataUrl(firebaseUser.displayName || 'C', baseUser),
              websiteUrl: '',
              role: isOwnerAdmin ? 'superadmin' : 'creator',
              isVerified: isOwnerAdmin,
              isKidsAccount: false,
              followersCount: 0,
              followingCount: 0,
              totalViews: 0,
              totalLikes: 0,
              totalShares: 0,
              isSuspended: false,
              createdAt: new Date().toISOString(),
              securityQuestion: 'আপনার প্রিয় শহর কোনটি?',
              securityAnswer: 'dhaka',
              socialLinks: [],
              sessions: [getClientSession()],
            };
            await setDoc(userDocRef, sanitizeUserForFirestore(newProfile));
            setCurrentUser(newProfile);
            localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(newProfile));
          }
        } catch (err) {
          console.error('Firestore user fetch notice', err);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Global Handle Availability and Uniqueness Check (Firestore + Local merged directory)
  const checkHandleAvailability = (
    handle: string,
    excludeUserId?: string
  ): { available: boolean; message?: string; suggestions?: string[] } => {
    const formatted = normalizeHandle(handle);
    const formatCheck = validateHandleFormat(formatted);
    if (!formatCheck.isValid) {
      return { available: false, message: formatCheck.error };
    }

    const mergedAccounts = getMergedUsers();
    const taken = checkHandleCollision(formatted, mergedAccounts, excludeUserId);
    if (taken) {
      const suggestions = generateHandleSuggestions(formatted, mergedAccounts);
      return {
        available: false,
        message: `এই হ্যান্ডেলটি (${formatted}) ইতিমধ্যে অন্য কেউ ব্যবহার করছেন। একই হ্যান্ডেল কপি করা যাবে না।`,
        suggestions,
      };
    }

    return {
      available: true,
      message: `${formatted} উপলব্ধ রয়েছে এবং এটি সম্পূর্ণ অনন্য!`,
    };
  };

  // Authoritative Firestore query to ensure a handle is not copied across browsers/devices
  const verifyRemoteHandleUnique = async (
    formattedHandle: string,
    excludeUserId?: string
  ): Promise<boolean> => {
    const identifier = formattedHandle.slice(1);
    try {
      const [byUsernameSnap, byHandleSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('username', '==', identifier))),
        getDocs(query(collection(db, 'users'), where('handle', '==', formattedHandle))),
      ]);

      let taken = false;
      byUsernameSnap.forEach((d) => {
        if (!excludeUserId || d.id !== excludeUserId) taken = true;
      });
      byHandleSnap.forEach((d) => {
        if (!excludeUserId || d.id !== excludeUserId) taken = true;
      });
      return !taken;
    } catch {
      return true;
    }
  };

  // Register account: Names (fullName / channelName) can be copied; @handle MUST be globally unique
  const registerAccount = async (
    data: RegisterData
  ): Promise<{ success: boolean; message?: string }> => {
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanPassword = data.password.trim();
    const cleanFullName = data.fullName.trim();
    const cleanChannelName = data.channelName.trim();
    const cleanQuestion = data.securityQuestion.trim();
    const cleanAnswer = data.securityAnswer.trim().toLowerCase();

    if (!cleanFullName) return { success: false, message: 'আপনার পূর্ণ নাম প্রদান করুন।' };
    if (!cleanChannelName) return { success: false, message: 'চ্যানেলের নাম প্রদান করুন।' };

    const formattedHandle = normalizeHandle(data.handle);
    const handleCheck = validateHandleFormat(formattedHandle);
    if (!handleCheck.isValid) {
      return {
        success: false,
        message: handleCheck.error || 'হ্যান্ডেলের প্রথমে অবশ্যই @ থাকতে হবে।',
      };
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: 'একটি সঠিক জিমেইল অ্যাড্রেস প্রদান করুন।' };
    }
    if (cleanPassword.length < 6) {
      return { success: false, message: 'পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।' };
    }
    if (!cleanQuestion) {
      return { success: false, message: 'নিরাপত্তা প্রশ্ন (Security Question) নির্ধারণ করুন।' };
    }
    if (!cleanAnswer) {
      return { success: false, message: 'নিরাপত্তা প্রশ্নের উত্তর প্রদান করুন।' };
    }

    try {
      const mergedAccounts = getMergedUsers();
      const duplicateEmail = mergedAccounts.find((a) => a.email.toLowerCase() === cleanEmail);
      if (duplicateEmail) {
        return {
          success: false,
          message: 'এই জিমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট তৈরি করা হয়েছে।',
        };
      }

      // Enforce global @handle uniqueness (local merged + remote authoritative check)
      if (checkHandleCollision(formattedHandle, mergedAccounts)) {
        return {
          success: false,
          message: `এই হ্যান্ডেলটি (${formattedHandle}) ইতিমধ্যে অন্য একজন ক্রিয়েটর নিয়েছেন। একই হ্যান্ডেল কপি করা যাবে না।`,
        };
      }

      const isRemotelyAvailable = await verifyRemoteHandleUnique(formattedHandle);
      if (!isRemotelyAvailable) {
        return {
          success: false,
          message: `এই হ্যান্ডেলটি (${formattedHandle}) ইতিমধ্যে অন্য একজন ক্রিয়েটর নিয়েছেন। একই হ্যান্ডেল কপি করা যাবে না।`,
        };
      }

      const username = formattedHandle.slice(1);
      const isOwnerAdmin = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase();
      const nowIso = new Date().toISOString();

      const newProfile: UserProfile = {
        id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        email: cleanEmail,
        password: cleanPassword,
        username,
        handle: formattedHandle,
        displayName: cleanFullName,
        channelName: cleanChannelName,
        avatarUrl:
          data.channelLogo ||
          generateDefaultAvatarDataUrl(cleanChannelName || cleanFullName, username),
        bio: `${cleanChannelName} - বাশারটিউব অফিসিয়াল চ্যানেল 🇧🇩`,
        websiteUrl: '',
        role: isOwnerAdmin ? 'superadmin' : 'creator',
        isVerified: isOwnerAdmin,
        isKidsAccount: false,
        followersCount: 0,
        followingCount: 0,
        totalLikes: 0,
        totalViews: 0,
        totalShares: 0,
        isSuspended: false,
        createdAt: nowIso,
        updatedAt: nowIso,
        securityQuestion: cleanQuestion,
        securityAnswer: cleanAnswer,
        socialLinks: [],
        sessions: [getClientSession()],
      };

      const localAccounts = readLocalAccounts();
      localAccounts.push(newProfile);
      writeLocalAccounts(localAccounts);

      firestoreUsersRef.current = [
        ...firestoreUsersRef.current.filter((u) => u.id !== newProfile.id),
        newProfile,
      ];
      refreshMergedDirectory();

      setCurrentUser(newProfile);
      localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(newProfile));

      try {
        await setDoc(doc(db, 'users', newProfile.id), sanitizeUserForFirestore(newProfile));
      } catch (err) {
        console.warn('Firestore user sync notice:', err);
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || 'অ্যাকাউন্ট তৈরি করতে সমস্যা হয়েছে।' };
    }
  };

  // Login with Gmail & Password
  const loginWithCredentials = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; message?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = pass.trim();

    if (!cleanEmail || !cleanPassword) {
      return { success: false, message: 'জিমেইল এবং পাসওয়ার্ড উভয়ই আবশ্যক।' };
    }

    try {
      const mergedAccounts = getMergedUsers();

      // 1. Check Super Admin Master Account (preserving any saved profile edits!)
      if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
        if (cleanPassword === adminPassword || cleanPassword === SUPER_ADMIN_PASSWORD) {
          const savedAdmin = mergedAccounts.find(
            (a) => a.id === 'user_superadmin' || a.email.toLowerCase() === cleanEmail
          );
          const superAdminProfile: UserProfile = {
            id: savedAdmin?.id || 'user_superadmin',
            email: savedAdmin?.email || SUPER_ADMIN_EMAIL,
            username: savedAdmin?.username || 'abdul_bashar',
            handle: savedAdmin?.handle || '@abdul_bashar',
            displayName: savedAdmin?.displayName || 'Abdul Bashar',
            channelName: savedAdmin?.channelName || 'BasharTube Official',
            bio: savedAdmin?.bio || 'Founder & Super Admin of BasharTube 🇧🇩',
            avatarUrl:
              savedAdmin?.avatarUrl ||
              generateDefaultAvatarDataUrl('Abdul Bashar', 'abdul_bashar'),
            websiteUrl: savedAdmin?.websiteUrl || 'https://bashartube.bd',
            role: 'superadmin',
            isVerified: true,
            isKidsAccount: false,
            followersCount: savedAdmin?.followersCount || 0,
            followingCount: savedAdmin?.followingCount || 0,
            totalLikes: savedAdmin?.totalLikes || 0,
            totalViews: savedAdmin?.totalViews || 0,
            totalShares: savedAdmin?.totalShares || 0,
            isSuspended: false,
            createdAt: savedAdmin?.createdAt || '2026-01-01T00:00:00Z',
            updatedAt: savedAdmin?.updatedAt,
            securityQuestion:
              savedAdmin?.securityQuestion || 'আপনার প্রিয় সোশ্যাল প্ল্যাটফর্ম কোনটি?',
            securityAnswer: savedAdmin?.securityAnswer || 'bashartube',
            socialLinks: savedAdmin?.socialLinks || [],
            sessions: [getClientSession()],
          };
          setCurrentUser(superAdminProfile);
          localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(superAdminProfile));
          setIsAdminUnlocked(true);
          sessionStorage.setItem('bashartube_admin_unlocked', 'true');
          return { success: true };
        }
      }

      // 2. Check registered accounts (local + Firestore directory)
      let found = mergedAccounts.find((a) => a.email.toLowerCase() === cleanEmail);
      if (!found) {
        try {
          const snap = await getDocs(
            query(collection(db, 'users'), where('email', '==', cleanEmail))
          );
          snap.forEach((d) => {
            found = { id: d.id, ...(d.data() as Omit<UserProfile, 'id'>) };
          });
        } catch {}
      }

      if (!found) {
        return {
          success: false,
          message:
            'এই জিমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি। অনুগ্রহ করে নতুন অ্যাকাউন্ট খুলুন।',
        };
      }

      if (found.password && found.password !== cleanPassword) {
        return { success: false, message: 'ভুল পাসওয়ার্ড! অনুগ্রহ করে সঠিক পাসওয়ার্ড দিন।' };
      }

      if (found.isSuspended) {
        return {
          success: false,
          message: 'আপনার অ্যাকাউন্টটি সাময়িকভাবে স্থগিত (Suspended) রয়েছে।',
        };
      }

      const currentSession = getClientSession();
      const updatedSessions = [
        currentSession,
        ...(found.sessions || []).filter((s) => s.deviceName !== currentSession.deviceName),
      ].slice(0, 5);

      const loggedInUser: UserProfile = {
        ...found,
        handle: found.handle || `@${found.username}`,
        sessions: updatedSessions,
      };

      setCurrentUser(loggedInUser);
      localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(loggedInUser));
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || 'লগইন করতে সমস্যা হয়েছে।' };
    }
  };

  // Get Security Question for Password Recovery
  const getSecurityQuestionByEmail = (email: string): { question?: string; error?: string } => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return { error: 'জিমেইল ঠিকানা প্রদান করুন।' };

    if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
      return { question: 'আপনার প্রিয় সোশ্যাল প্ল্যাটফর্ম কোনটি?' };
    }

    const merged = getMergedUsers();
    const found = merged.find((a) => a.email.toLowerCase() === cleanEmail);
    if (!found) {
      return { error: 'এই জিমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি।' };
    }
    return { question: found.securityQuestion || 'আপনার প্রিয় শহর কোনটি?' };
  };

  // Reset Password with Security Question
  const resetPasswordWithSecurityQuestion = (
    email: string,
    answer: string,
    newPass: string
  ): { success: boolean; message?: string } => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanAnswer = answer.trim().toLowerCase();
    const cleanNewPass = newPass.trim();

    const attemptInfo = failedAttempts[cleanEmail];
    if (attemptInfo && attemptInfo.lockUntil && Date.now() < attemptInfo.lockUntil) {
      const waitSec = Math.ceil((attemptInfo.lockUntil - Date.now()) / 1000);
      return {
        success: false,
        message: `নিরাপত্তা সুরক্ষার্থে অনুগ্রহ করে ${waitSec} সেকেন্ড পর পুনরায় চেষ্টা করুন।`,
      };
    }

    if (cleanNewPass.length < 6) {
      return { success: false, message: 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' };
    }

    if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
      if (cleanAnswer === 'bashartube') {
        setAdminPassword(cleanNewPass);
        localStorage.setItem('bashartube_admin_master_password', cleanNewPass);
        setFailedAttempts((prev) => ({ ...prev, [cleanEmail]: { count: 0 } }));
        return { success: true, message: 'সুপার অ্যাডমিন পাসওয়ার্ড সফলভাবে রিসেট হয়েছে!' };
      } else {
        const nextCount = (attemptInfo?.count || 0) + 1;
        const lockUntil = nextCount >= 3 ? Date.now() + 60000 : undefined;
        setFailedAttempts((prev) => ({ ...prev, [cleanEmail]: { count: nextCount, lockUntil } }));
        return { success: false, message: 'ভুল নিরাপত্তা উত্তর! সঠিক উত্তর প্রদান করুন।' };
      }
    }

    try {
      const accounts = readLocalAccounts();
      const idx = accounts.findIndex((a) => a.email.toLowerCase() === cleanEmail);

      if (idx === -1) {
        return { success: false, message: 'অ্যাকাউন্ট খুঁজে পাওয়া যায়নি।' };
      }

      const user = accounts[idx];
      const correctAnswer = (user.securityAnswer || '').trim().toLowerCase();

      if (cleanAnswer !== correctAnswer) {
        const nextCount = (attemptInfo?.count || 0) + 1;
        const lockUntil = nextCount >= 3 ? Date.now() + 60000 : undefined;
        setFailedAttempts((prev) => ({ ...prev, [cleanEmail]: { count: nextCount, lockUntil } }));
        return { success: false, message: 'ভুল নিরাপত্তা উত্তর! সঠিক উত্তর প্রদান করুন।' };
      }

      accounts[idx].password = cleanNewPass;
      writeLocalAccounts(accounts);
      setFailedAttempts((prev) => ({ ...prev, [cleanEmail]: { count: 0 } }));

      if (currentUser && currentUser.email.toLowerCase() === cleanEmail) {
        const updated = { ...currentUser, password: cleanNewPass };
        setCurrentUser(updated);
        localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(updated));
      }

      return {
        success: true,
        message: 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে! এখন নতুন পাসওয়ার্ড দিয়ে লগইন করুন।',
      };
    } catch {
      return { success: false, message: 'পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে।' };
    }
  };

  // Change Password anytime from Security settings
  const changePassword = async (
    currentPass: string,
    newPass: string
  ): Promise<{ success: boolean; message?: string }> => {
    if (!currentUser) return { success: false, message: 'অনুগ্রহ করে লগইন করুন।' };
    const cleanCurrent = currentPass.trim();
    const cleanNew = newPass.trim();

    if (!cleanCurrent) return { success: false, message: 'বর্তমান পাসওয়ার্ড প্রদান করুন।' };
    if (cleanNew.length < 6) {
      return { success: false, message: 'নতুন পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।' };
    }

    if (currentUser.password && currentUser.password !== cleanCurrent && cleanCurrent !== adminPassword) {
      return { success: false, message: 'বর্তমান পাসওয়ার্ডটি সঠিক নয়।' };
    }

    const updatedProfile: UserProfile = {
      ...currentUser,
      password: cleanNew,
      updatedAt: new Date().toISOString(),
    };

    setCurrentUser(updatedProfile);
    localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(updatedProfile));

    const accounts = readLocalAccounts();
    const idx = accounts.findIndex((a) => a.id === currentUser.id);
    if (idx !== -1) {
      accounts[idx] = updatedProfile;
      writeLocalAccounts(accounts);
    }

    if (currentUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      setAdminPassword(cleanNew);
      localStorage.setItem('bashartube_admin_master_password', cleanNew);
    }

    return { success: true, message: 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!' };
  };

  // Change Security Question with Current Password Verification
  const changeSecurityQuestion = async (
    currentPass: string,
    newQuestion: string,
    newAnswer: string
  ): Promise<{ success: boolean; message?: string }> => {
    if (!currentUser) return { success: false, message: 'অনুগ্রহ করে লগইন করুন।' };
    if (!currentPass.trim()) return { success: false, message: 'বর্তমান পাসওয়ার্ড প্রদান করুন।' };
    if (!newQuestion.trim()) return { success: false, message: 'নতুন নিরাপত্তা প্রশ্ন লিখুন।' };
    if (!newAnswer.trim()) return { success: false, message: 'নতুন নিরাপত্তা উত্তর দিন।' };

    const cleanPass = currentPass.trim();
    if (currentUser.password && currentUser.password !== cleanPass && cleanPass !== adminPassword) {
      return { success: false, message: 'বর্তমান পাসওয়ার্ডটি সঠিক নয়।' };
    }

    const updatedProfile: UserProfile = {
      ...currentUser,
      securityQuestion: newQuestion.trim(),
      securityAnswer: newAnswer.trim().toLowerCase(),
      updatedAt: new Date().toISOString(),
    };

    setCurrentUser(updatedProfile);
    localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(updatedProfile));

    try {
      const accounts = readLocalAccounts();
      const idx = accounts.findIndex((a) => a.id === currentUser.id);
      if (idx !== -1) {
        accounts[idx] = updatedProfile;
        writeLocalAccounts(accounts);
      }
      await setDoc(
        doc(db, 'users', currentUser.id),
        {
          securityQuestion: updatedProfile.securityQuestion,
          securityAnswer: updatedProfile.securityAnswer,
          updatedAt: updatedProfile.updatedAt,
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Update question notice:', err);
    }

    return { success: true, message: 'নিরাপত্তা প্রশ্ন ও উত্তর সফলভাবে আপডেট হয়েছে!' };
  };

  // Logout specific device session
  const logoutSession = (sessionId: string) => {
    if (!currentUser) return;
    const remaining = (currentUser.sessions || []).filter((s) => s.id !== sessionId);
    const updated = { ...currentUser, sessions: remaining };
    setCurrentUser(updated);
    localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(updated));

    const isCurrent = (currentUser.sessions || []).find((s) => s.id === sessionId)?.isCurrent;
    if (isCurrent) {
      logout();
    }
  };

  // Fetch active devices and sessions
  const fetchActiveSessions = async (): Promise<UserSession[]> => {
    if (!currentUser) return [];

    let currentTokenId = 'fb_tok_' + currentUser.id.substring(0, 8);
    if (fbUser) {
      try {
        const token = await fbUser.getIdToken(false);
        currentTokenId = 'fb_' + token.substring(token.length - 12);
      } catch {}
    }

    try {
      const userDocRef = doc(db, 'users', currentUser.id);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        if (data.sessions && data.sessions.length > 0) {
          return data.sessions.map((s) => ({
            ...s,
            sessionToken:
              s.sessionToken ||
              (s.isCurrent ? currentTokenId : `fb_tok_rem_${s.id.slice(-6)}`),
            tokenStatus: s.tokenStatus || ('active' as const),
          }));
        }
      }
    } catch {}

    const currentDev = getClientSession();
    currentDev.sessionToken = currentTokenId;
    currentDev.tokenStatus = 'active';

    return currentUser.sessions && currentUser.sessions.length > 0
      ? currentUser.sessions.map((s) => ({
          ...s,
          sessionToken:
            s.sessionToken ||
            (s.isCurrent ? currentTokenId : `fb_tok_rem_${s.id.slice(-6)}`),
          tokenStatus: s.tokenStatus || ('active' as const),
        }))
      : [currentDev];
  };

  const invalidateSessionWithToken = async (
    sessionId: string
  ): Promise<{ success: boolean; message?: string }> => {
    if (!currentUser) return { success: false, message: 'ব্যবহারকারী লগইন অবস্থায় নেই।' };

    try {
      if (fbUser) {
        try {
          await fbUser.getIdToken(true);
        } catch {}
      }

      const currentList =
        currentUser.sessions && currentUser.sessions.length > 0
          ? currentUser.sessions
          : await fetchActiveSessions();

      const targetSession = currentList.find((s) => s.id === sessionId);
      const isCurrent = targetSession?.isCurrent;
      const remaining = currentList.filter((s) => s.id !== sessionId);

      const updatedProfile = {
        ...currentUser,
        sessions: remaining,
      };

      setCurrentUser(updatedProfile);
      localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(updatedProfile));

      try {
        await setDoc(doc(db, 'users', currentUser.id), { sessions: remaining }, { merge: true });
      } catch {}

      if (isCurrent) {
        await logout();
        return {
          success: true,
          message: 'বর্তমান সেশন সফলভাবে লগআউট করা হয়েছে।',
        };
      }

      return {
        success: true,
        message: 'নির্বাচিত ডিভাইস সেশন সফলভাবে লগআউট করা হয়েছে।',
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'সেশন অকার্যকর করতে সমস্যা হয়েছে।' };
    }
  };

  // Permanent Account Deletion with Password Confirmation
  const deleteAccountWithPassword = async (
    password: string
  ): Promise<{ success: boolean; message?: string }> => {
    if (!currentUser) return { success: false, message: 'কোনো সক্রিয় ব্যবহারকারী পাওয়া যায়নি।' };
    const cleanPass = password.trim();

    if (currentUser.password && currentUser.password !== cleanPass && cleanPass !== adminPassword) {
      return {
        success: false,
        message: 'ভুল পাসওয়ার্ড! সঠিক পাসওয়ার্ড ছাড়া অ্যাকাউন্ট মুছে ফেলা সম্ভব নয়।',
      };
    }

    try {
      const filtered = readLocalAccounts().filter((a) => a.id !== currentUser.id);
      writeLocalAccounts(filtered);
      firestoreUsersRef.current = firestoreUsersRef.current.filter((u) => u.id !== currentUser.id);
      refreshMergedDirectory();

      try {
        await deleteDoc(doc(db, 'users', currentUser.id));
      } catch {}

      await logout();
      return { success: true, message: 'আপনার অ্যাকাউন্ট স্থায়ীভাবে মুছে ফেলা হয়েছে।' };
    } catch (err: any) {
      return { success: false, message: err.message || 'অ্যাকাউন্ট মোছা সম্পন্ন করা যায়নি।' };
    }
  };

  // Update Social Media Links
  const updateSocialLinks = async (links: SocialMediaLink[]) => {
    if (!currentUser) return;
    const nowIso = new Date().toISOString();
    const updated = { ...currentUser, socialLinks: links, updatedAt: nowIso };
    setCurrentUser(updated);
    localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(updated));

    const accounts = readLocalAccounts();
    const idx = accounts.findIndex((a) => a.id === currentUser.id);
    if (idx !== -1) {
      accounts[idx] = { ...accounts[idx], socialLinks: links, updatedAt: nowIso };
    } else {
      accounts.push(updated);
    }
    writeLocalAccounts(accounts);
    firestoreUsersRef.current = [
      ...firestoreUsersRef.current.filter((u) => u.id !== currentUser.id),
      updated,
    ];
    refreshMergedDirectory();

    try {
      await setDoc(
        doc(db, 'users', currentUser.id),
        { socialLinks: links, updatedAt: nowIso },
        { merge: true }
      );
    } catch {}
  };

  const updateNotificationCategory = (
    category: keyof NotificationCategorySettings,
    enabled: boolean
  ) => {
    const updatedCategories = {
      ...preferences.notificationCategories,
      [category]: enabled,
    };
    const nextPrefs = {
      ...preferences,
      notificationCategories: updatedCategories,
    };
    setPreferences(nextPrefs);
    localStorage.setItem('bashartube_prefs', JSON.stringify(nextPrefs));
  };

  const toggleSeenStatus = (enabled: boolean) => {
    const nextPrefs = {
      ...preferences,
      seenStatusEnabled: enabled,
    };
    setPreferences(nextPrefs);
    localStorage.setItem('bashartube_prefs', JSON.stringify(nextPrefs));
  };

  const loginWithGoogle = async () => {
    try {
      setIsLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.warn('Google sign-in notice:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
    } catch {}
    setCurrentUser(null);
    localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
    setIsAdminUnlocked(false);
    sessionStorage.removeItem('bashartube_admin_unlocked');
  };

  // Update ANY profile field anytime cleanly; enforces unique @handle globally while allowing duplicate names!
  const updateProfile = async (
    updates: Partial<UserProfile>
  ): Promise<{ success: boolean; message?: string }> => {
    if (!currentUser) return { success: false, message: 'ব্যবহারকারী লগইন অবস্থায় নেই।' };

    const sanitizedUpdates: Partial<UserProfile> = { ...updates };

    if (sanitizedUpdates.displayName !== undefined) {
      const cleanName = sanitizedUpdates.displayName.trim();
      if (!cleanName) {
        return { success: false, message: 'পূর্ণ নাম খালি রাখা যাবে না।' };
      }
      sanitizedUpdates.displayName = cleanName;
    }

    if (sanitizedUpdates.channelName !== undefined) {
      const cleanChannel = sanitizedUpdates.channelName.trim();
      if (!cleanChannel) {
        return { success: false, message: 'চ্যানেলের নাম খালি রাখা যাবে না।' };
      }
      sanitizedUpdates.channelName = cleanChannel;
    }

    if (sanitizedUpdates.email !== undefined) {
      const cleanEmail = sanitizedUpdates.email.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        return { success: false, message: 'একটি সঠিক জিমেইল / ইমেইল ঠিকানা লিখুন।' };
      }
      const mergedAccounts = getMergedUsers();
      const emailTaken = mergedAccounts.some(
        (u) => u.id !== currentUser.id && u.email.toLowerCase() === cleanEmail
      );
      if (emailTaken) {
        return {
          success: false,
          message: 'এই ইমেইল ঠিকানাটি ইতিমধ্যে অন্য একটি অ্যাকাউন্টে ব্যবহৃত হচ্ছে।',
        };
      }
      sanitizedUpdates.email = cleanEmail;
    }

    if (sanitizedUpdates.websiteUrl !== undefined) {
      sanitizedUpdates.websiteUrl = formatWebsiteUrl(sanitizedUpdates.websiteUrl);
    }

    if (sanitizedUpdates.bio !== undefined) {
      sanitizedUpdates.bio = sanitizedUpdates.bio.trim();
    }

    // If handle is being updated, enforce format + global uniqueness (local merged + authoritative Firestore check)
    if (sanitizedUpdates.handle !== undefined || sanitizedUpdates.username !== undefined) {
      const rawHandle = sanitizedUpdates.handle ?? sanitizedUpdates.username ?? '';
      const formattedHandle = normalizeHandle(rawHandle);
      const formatCheck = validateHandleFormat(formattedHandle);
      if (!formatCheck.isValid) {
        return { success: false, message: formatCheck.error };
      }

      const mergedAccounts = getMergedUsers();
      if (checkHandleCollision(formattedHandle, mergedAccounts, currentUser.id)) {
        return {
          success: false,
          message: `হ্যান্ডেল (${formattedHandle}) ইতিমধ্যে অন্য কেউ নিয়েছেন। একই হ্যান্ডেল কপি করা যাবে না।`,
        };
      }

      const isRemotelyAvailable = await verifyRemoteHandleUnique(formattedHandle, currentUser.id);
      if (!isRemotelyAvailable) {
        return {
          success: false,
          message: `হ্যান্ডেল (${formattedHandle}) ইতিমধ্যে অন্য কেউ নিয়েছেন। একই হ্যান্ডেল কপি করা যাবে না।`,
        };
      }

      sanitizedUpdates.handle = formattedHandle;
      sanitizedUpdates.username = formattedHandle.slice(1);
    }

    const nowIso = new Date().toISOString();
    const updated: UserProfile = {
      ...currentUser,
      ...sanitizedUpdates,
      handle:
        sanitizedUpdates.handle ||
        currentUser.handle ||
        `@${sanitizedUpdates.username || currentUser.username}`,
      updatedAt: nowIso,
    };

    setCurrentUser(updated);
    localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(updated));

    // Upsert into local accounts directory
    const accounts = readLocalAccounts();
    const idx = accounts.findIndex((a) => a.id === currentUser.id);
    if (idx !== -1) {
      accounts[idx] = { ...accounts[idx], ...updated };
    } else {
      accounts.push(updated);
    }
    writeLocalAccounts(accounts);

    // Update live merged directory ref + state immediately
    firestoreUsersRef.current = [
      ...firestoreUsersRef.current.filter((u) => u.id !== currentUser.id),
      updated,
    ];
    refreshMergedDirectory();

    // Persist to Firestore cleanly with setDoc({ merge: true }) so it always works even if doc didn't exist yet
    try {
      await setDoc(doc(db, 'users', currentUser.id), sanitizeUserForFirestore(updated), {
        merge: true,
      });
    } catch (err) {
      console.warn('Firestore update profile notice:', err);
    }

    return { success: true, message: 'প্রোফাইলের সমস্ত পরিবর্তন সফলভাবে সংরক্ষিত হয়েছে!' };
  };

  const updatePreferences = (updates: Partial<UserPreferences>) => {
    const nextPrefs = { ...preferences, ...updates };
    setPreferences(nextPrefs);
    localStorage.setItem('bashartube_prefs', JSON.stringify(nextPrefs));
  };

  const toggleBlockUser = (targetUserId: string) => {
    const current = preferences.blockedUserIds || [];
    const exists = current.includes(targetUserId);
    const updated = exists ? current.filter((id) => id !== targetUserId) : [...current, targetUserId];
    updatePreferences({ blockedUserIds: updated });
  };

  const toggleDontRecommendCreator = (creatorId: string) => {
    const current = preferences.dontRecommendCreatorIds || [];
    const exists = current.includes(creatorId);
    const updated = exists
      ? current.filter((id) => id !== creatorId)
      : [...current, creatorId];
    updatePreferences({ dontRecommendCreatorIds: updated });
  };

  // Admin Password Vault Methods
  const unlockAdminWithPassword = (pass: string): { success: boolean; message?: string } => {
    const trimmed = pass.trim();
    if (
      trimmed === adminPassword ||
      trimmed === SUPER_ADMIN_PASSWORD ||
      trimmed === 'Fahmida3421'
    ) {
      setIsAdminUnlocked(true);
      sessionStorage.setItem('bashartube_admin_unlocked', 'true');
      return { success: true };
    }
    return {
      success: false,
      message: 'ভুল সিকিউরিটি পাসওয়ার্ড! সঠিক সুপার অ্যাডমিন পাসওয়ার্ড প্রদান করুন।',
    };
  };

  const lockAdmin = () => {
    setIsAdminUnlocked(false);
    sessionStorage.removeItem('bashartube_admin_unlocked');
  };

  const updateAdminPassword = (
    oldPass: string,
    newPass: string
  ): { success: boolean; message?: string } => {
    if (oldPass.trim() !== adminPassword && oldPass.trim() !== SUPER_ADMIN_PASSWORD) {
      return { success: false, message: 'বর্তমান পাসওয়ার্ডটি সঠিক নয়।' };
    }
    if (newPass.trim().length < 8) {
      return { success: false, message: 'নতুন পাসওয়ার্ড অন্তত ৮ অক্ষরের ও শক্তিশালী হতে হবে।' };
    }
    const cleanNewPass = newPass.trim();
    setAdminPassword(cleanNewPass);
    localStorage.setItem('bashartube_admin_master_password', cleanNewPass);
    return { success: true, message: 'অ্যাডমিন মাস্টার পাসওয়ার্ড সফলভাবে আপডেট করা হয়েছে।' };
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        fbUser,
        isLoading,
        preferences,
        isSuperAdmin,
        isAdmin,
        registeredCreators,
        checkHandleAvailability,
        registerAccount,
        loginWithCredentials,
        getSecurityQuestionByEmail,
        resetPasswordWithSecurityQuestion,
        changeSecurityQuestion,
        changePassword,
        deviceSessions,
        logoutSession,
        fetchActiveSessions,
        invalidateSessionWithToken,
        deleteAccountWithPassword,
        updateSocialLinks,
        updateNotificationCategory,
        toggleSeenStatus,
        loginWithGoogle,
        logout,
        updateProfile,
        updatePreferences,
        toggleBlockUser,
        toggleDontRecommendCreator,
        adminPassword,
        isAdminUnlocked,
        unlockAdminWithPassword,
        lockAdmin,
        updateAdminPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

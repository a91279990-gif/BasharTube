import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  MonetizationApplication, 
  WithdrawalRequest, 
  EarningTransaction, 
  AntiFraudLog,
  UserProfile,
  MonetizationStatus 
} from '../types';
import { useAuth } from './AuthContext';
import { 
  checkMonetizationEligibility, 
  calculateViewsIncome, 
  calculateWatchTimeIncome, 
  calculateTotalIncome,
  validateBKashNumber, 
  detectSuspiciousEngagement,
  MIN_WITHDRAWAL_AMOUNT,
  MONETIZATION_MIN_VIEWS,
  MONETIZATION_MIN_WATCH_HOURS,
  MONETIZATION_MIN_FOLLOWERS,
  MonetizationConfig,
  DEFAULT_MONETIZATION_CONFIG
} from '../utils/monetizationEngine';
import { doc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface MonetizationContextType {
  applications: MonetizationApplication[];
  withdrawals: WithdrawalRequest[];
  transactions: EarningTransaction[];
  antiFraudLogs: AntiFraudLog[];
  monetizationConfig: MonetizationConfig;
  
  // Creator metrics & status
  creatorMonetizationStatus: MonetizationStatus;
  eligibilityMetrics: {
    isEligible: boolean;
    viewsProgress: number;
    watchHoursProgress: number;
    followersProgress: number;
    remainingViews: number;
    remainingWatchHours: number;
    remainingFollowers: number;
    targetViews: number;
    targetWatchHours: number;
    targetFollowers: number;
  };
  creatorTransactions: EarningTransaction[];
  creatorWithdrawals: WithdrawalRequest[];
  
  // Creator actions
  applyForMonetization: (data: { originalContentCertified: boolean; note?: string }) => Promise<{ success: boolean; message?: string }>;
  requestBKashWithdrawal: (amount: number, bKashNumber: string, accountType: 'personal' | 'agent' | 'merchant') => Promise<{ success: boolean; message?: string }>;
  saveBKashSettings: (bKashNumber: string, accountType: 'personal' | 'agent' | 'merchant') => Promise<{ success: boolean; message?: string }>;
  recordRealEngagement: (videoId: string, authorId: string, videoTitle: string, watchSeconds: number, isInitialView: boolean) => Promise<{ counted: boolean; reason?: string }>;

  // Super Admin actions
  approveMonetization: (appId: string) => Promise<{ success: boolean; message?: string }>;
  rejectMonetization: (appId: string, reason: string) => Promise<{ success: boolean; message?: string }>;
  toggleCreatorMonetization: (creatorId: string, status: 'monetized' | 'suspended') => Promise<{ success: boolean; message?: string }>;
  approveWithdrawal: (reqId: string, bKashTrxId: string) => Promise<{ success: boolean; message?: string }>;
  rejectWithdrawal: (reqId: string, reason: string) => Promise<{ success: boolean; message?: string }>;
  updateMonetizationConfig: (newConfig: Partial<MonetizationConfig>) => Promise<{ success: boolean; message?: string }>;
  resetMonetizationConfig: () => Promise<{ success: boolean; message?: string }>;
}

const MonetizationContext = createContext<MonetizationContextType | undefined>(undefined);

export const MonetizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, updateProfile } = useAuth();

  // Monetization Applications
  const [applications, setApplications] = useState<MonetizationApplication[]>(() => {
    try {
      const saved = localStorage.getItem('bashartube_monetization_apps');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Withdrawal Requests (bKash)
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>(() => {
    try {
      const saved = localStorage.getItem('bashartube_withdrawals');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Earnings Transactions
  const [transactions, setTransactions] = useState<EarningTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('bashartube_transactions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Anti-Fraud Logs
  const [antiFraudLogs, setAntiFraudLogs] = useState<AntiFraudLog[]>(() => {
    try {
      const saved = localStorage.getItem('bashartube_antifraud_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Dynamic Monetization Configuration (Admin editable: eligibility milestones & fixed rates)
  const [monetizationConfig, setMonetizationConfig] = useState<MonetizationConfig>(() => {
    try {
      const saved = localStorage.getItem('bashartube_monetization_config');
      return saved ? { ...DEFAULT_MONETIZATION_CONFIG, ...JSON.parse(saved) } : DEFAULT_MONETIZATION_CONFIG;
    } catch {
      return DEFAULT_MONETIZATION_CONFIG;
    }
  });

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('bashartube_monetization_apps', JSON.stringify(applications));
  }, [applications]);

  useEffect(() => {
    localStorage.setItem('bashartube_withdrawals', JSON.stringify(withdrawals));
  }, [withdrawals]);

  useEffect(() => {
    localStorage.setItem('bashartube_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('bashartube_antifraud_logs', JSON.stringify(antiFraudLogs));
  }, [antiFraudLogs]);

  useEffect(() => {
    localStorage.setItem('bashartube_monetization_config', JSON.stringify(monetizationConfig));
  }, [monetizationConfig]);

  // Real-time sync of Admin Monetization & Money Config from Firestore
  useEffect(() => {
    try {
      const unsub = onSnapshot(
        doc(db, 'platform_settings', 'monetization'),
        (snap) => {
          if (snap.exists()) {
            const remote = snap.data() as Partial<MonetizationConfig>;
            setMonetizationConfig((prev) => {
              const merged = { ...DEFAULT_MONETIZATION_CONFIG, ...prev, ...remote };
              try {
                localStorage.setItem('bashartube_monetization_config', JSON.stringify(merged));
              } catch {}
              return merged;
            });
          }
        },
        () => {
          // Safely retain localStorage configuration if Firestore is unreachable or denied
        }
      );
      return () => unsub();
    } catch {
      return undefined;
    }
  }, []);

  // Current creator's monetization status
  const creatorMonetizationStatus: MonetizationStatus = 
    currentUser?.monetizationStatus || 'not_eligible';

  // Current creator's eligibility metrics computed against dynamic active config
  const eligibilityMetrics = checkMonetizationEligibility(
    currentUser?.validViewsCount || currentUser?.totalViews || 0,
    currentUser?.validWatchTimeHours || 0,
    currentUser?.followersCount || 0,
    monetizationConfig
  );

  // Filter creator's transactions and withdrawals
  const creatorTransactions = currentUser 
    ? transactions.filter(t => t.creatorId === currentUser.id)
    : [];

  const creatorWithdrawals = currentUser
    ? withdrawals.filter(w => w.creatorId === currentUser.id)
    : [];

  // ==========================================
  // CREATOR ACTIONS
  // ==========================================

  // 1. Apply for Monetization
  const applyForMonetization = async (data: { originalContentCertified: boolean; note?: string }): Promise<{ success: boolean; message?: string }> => {
    if (!currentUser) return { success: false, message: 'অনুগ্রহ করে প্রথমে লগইন করুন।' };

    if (!data.originalContentCertified) {
      return { success: false, message: 'অরিজিনাল কনটেন্টের অঙ্গীকার করা বাধ্যতামূলক। অন্যের কপি করা কনটেন্টে আয় করা যাবে না।' };
    }

    const currentViews = currentUser.validViewsCount || currentUser.totalViews || 0;
    const currentHours = currentUser.validWatchTimeHours || 0;
    const currentFollowers = currentUser.followersCount || 0;

    // Check dynamic minimum thresholds configured in Admin Panel
    if (
      currentViews < monetizationConfig.minViews ||
      currentHours < monetizationConfig.minWatchHours ||
      currentFollowers < monetizationConfig.minFollowers
    ) {
      return {
        success: false,
        message: `মনিটাইজেশনের শর্তাবলী এখনো অপূর্ণ রয়েছে (${monetizationConfig.minViews.toLocaleString()} ভিউ, ${monetizationConfig.minWatchHours.toLocaleString()} ঘণ্টা ওয়াচ টাইম ও ${monetizationConfig.minFollowers.toLocaleString()} ফলোয়ার আবশ্যক)।`
      };
    }

    // Check if existing pending application exists
    const hasPending = applications.some(a => a.creatorId === currentUser.id && a.status === 'pending');
    if (hasPending) {
      return { success: false, message: 'আপনার আবেদন ইতিমধ্যে সুপার অ্যাডমিনের পর্যালোচনায় (Pending Review) রয়েছে।' };
    }

    const newApp: MonetizationApplication = {
      id: 'app_' + Date.now(),
      creatorId: currentUser.id,
      creatorName: currentUser.displayName,
      channelName: currentUser.channelName || currentUser.displayName,
      creatorEmail: currentUser.email,
      creatorAvatar: currentUser.avatarUrl,
      handle: currentUser.handle || `@${currentUser.username}`,
      appliedAt: new Date().toISOString(),
      status: 'pending',
      validViews: currentViews,
      validWatchTimeHours: currentHours,
      followersCount: currentFollowers,
      originalContentCertified: true
    };

    const updatedApps = [newApp, ...applications];
    setApplications(updatedApps);

    await updateProfile({
      monetizationStatus: 'pending_review'
    });

    try {
      await setDoc(doc(db, 'monetization_applications', newApp.id), newApp);
    } catch {}

    return { 
      success: true, 
      message: 'মনিটাইজেশন আবেদন সফলভাবে পাঠানো হয়েছে! সুপার অ্যাডমিন যাচাই করে অনুমোদন প্রদান করবেন।' 
    };
  };

  // 2. Request bKash Withdrawal (Min ৳10,000)
  const requestBKashWithdrawal = async (
    amount: number, 
    bKashNumber: string, 
    accountType: 'personal' | 'agent' | 'merchant'
  ): Promise<{ success: boolean; message?: string }> => {
    if (!currentUser) return { success: false, message: 'অনুগ্রহ করে প্রথমে লগইন করুন।' };

    if (currentUser.monetizationStatus !== 'monetized') {
      return { success: false, message: 'শুধুমাত্র অনুমোদিত মনিটাইজড চ্যানেল থেকে টাকা উত্তোলন করা সম্ভব।' };
    }

    if (amount < monetizationConfig.minWithdrawalAmount) {
      return { success: false, message: `সর্বনিম্ন উত্তোলনের পরিমাণ ৳${monetizationConfig.minWithdrawalAmount.toLocaleString()} টাকা হতে হবে।` };
    }

    const available = currentUser.availableBalance || 0;
    if (amount > available) {
      return { success: false, message: `অপর্যাপ্ত ব্যালেন্স! আপনার উত্তোলনযোগ্য ব্যালেন্স ৳${available.toLocaleString()} টাকা।` };
    }

    const phoneCheck = validateBKashNumber(bKashNumber);
    if (!phoneCheck.isValid) {
      return { success: false, message: phoneCheck.error };
    }

    const newWithdrawal: WithdrawalRequest = {
      id: 'wth_' + Date.now(),
      creatorId: currentUser.id,
      creatorName: currentUser.displayName,
      channelName: currentUser.channelName || currentUser.displayName,
      handle: currentUser.handle || `@${currentUser.username}`,
      amount,
      bKashNumber: bKashNumber.trim(),
      bKashAccountType: accountType,
      status: 'pending',
      requestedAt: new Date().toISOString()
    };

    const updatedList = [newWithdrawal, ...withdrawals];
    setWithdrawals(updatedList);

    // Update creator balances: deduct from available, add to pending
    const newAvailable = Number((available - amount).toFixed(2));
    const newPending = Number(((currentUser.pendingWithdrawalBalance || 0) + amount).toFixed(2));

    await updateProfile({
      availableBalance: newAvailable,
      pendingWithdrawalBalance: newPending,
      bKashNumber: bKashNumber.trim(),
      bKashAccountType: accountType
    });

    try {
      await setDoc(doc(db, 'withdrawals', newWithdrawal.id), newWithdrawal);
    } catch {}

    return { 
      success: true, 
      message: `৳${amount.toLocaleString()} টাকার bKash ক্যাশআউট রিকোয়েস্ট সফলভাবে পাঠানো হয়েছে। সুপার অ্যাডমিন অনুমোদন করলে টাকা আপনার নম্বরে পৌঁছে যাবে।` 
    };
  };

  // 3. Save bKash Settings
  const saveBKashSettings = async (
    bKashNumber: string, 
    accountType: 'personal' | 'agent' | 'merchant'
  ): Promise<{ success: boolean; message?: string }> => {
    if (!currentUser) return { success: false, message: 'লগইন করুন।' };
    const check = validateBKashNumber(bKashNumber);
    if (!check.isValid) return { success: false, message: check.error };

    await updateProfile({
      bKashNumber: bKashNumber.trim(),
      bKashAccountType: accountType
    });

    return { success: true, message: 'বিকাশ অ্যাকাউন্ট সফলভাবে সংরক্ষণ করা হয়েছে!' };
  };

  // 4. Record Real Engagement & Automatic Real-Time Earnings
  const recordRealEngagement = async (
    videoId: string, 
    authorId: string, 
    videoTitle: string, 
    watchSeconds: number, 
    isInitialView: boolean
  ): Promise<{ counted: boolean; reason?: string }> => {
    // Anti-fraud check
    const fraudCheck = detectSuspiciousEngagement(watchSeconds, navigator.userAgent);
    if (!fraudCheck.isValid) {
      const fraudLog: AntiFraudLog = {
        id: 'fraud_' + Date.now(),
        creatorId: authorId,
        videoId,
        videoTitle,
        type: watchSeconds < 3 ? 'bot_detection' : 'loop_spam',
        actionTaken: 'discarded',
        details: fraudCheck.reason || 'অস্বাভাবিক ভিউ বা ওয়াচ টাইম ফিল্টার করা হয়েছে।',
        timestamp: new Date().toISOString()
      };
      setAntiFraudLogs(prev => [fraudLog, ...prev.slice(0, 49)]);
      return { counted: false, reason: fraudCheck.reason };
    }

    // Check author profile from registered accounts
    try {
      const accountsRaw = localStorage.getItem('bashartube_registered_accounts');
      if (!accountsRaw) return { counted: true };
      const accounts: UserProfile[] = JSON.parse(accountsRaw);
      const authorIndex = accounts.findIndex(a => a.id === authorId);

      if (authorIndex === -1) return { counted: true };
      const author = accounts[authorIndex];

      const watchHoursDelta = Number((watchSeconds / 3600).toFixed(6));
      const newValidViews = (author.validViewsCount || author.totalViews || 0) + (isInitialView ? 1 : 0);
      const newValidHours = Number(((author.validWatchTimeHours || 0) + watchHoursDelta).toFixed(4));

      author.validViewsCount = newValidViews;
      author.validWatchTimeHours = newValidHours;

      // If creator is MONETIZED, automatically credit earnings!
      if (author.monetizationStatus === 'monetized') {
        const ratePer1k = monetizationConfig.ratePer1000Views;
        const ratePerHour = monetizationConfig.ratePerWatchHour;
        const viewsEarned = isInitialView ? (1 / 1000) * ratePer1k : 0;
        const watchEarned = watchHoursDelta * ratePerHour;
        const totalDeltaEarned = Number((viewsEarned + watchEarned).toFixed(4));

        if (totalDeltaEarned > 0) {
          author.availableBalance = Number(((author.availableBalance || 0) + totalDeltaEarned).toFixed(2));
          author.lifetimeEarnings = Number(((author.lifetimeEarnings || 0) + totalDeltaEarned).toFixed(2));

          // Record Earning Transactions
          const newTxns: EarningTransaction[] = [];
          if (viewsEarned > 0) {
            newTxns.push({
              id: 'txn_v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
              creatorId: author.id,
              videoId,
              videoTitle,
              type: 'views_income',
              amount: viewsEarned,
              validUnits: 1,
              rateApplied: `৳${ratePer1k} / ১,০০০ ভিউ`,
              status: 'completed',
              timestamp: new Date().toISOString()
            });
          }
          if (watchEarned > 0.005) {
            newTxns.push({
              id: 'txn_w_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
              creatorId: author.id,
              videoId,
              videoTitle,
              type: 'watch_time_income',
              amount: Number(watchEarned.toFixed(2)),
              validUnits: Number(watchHoursDelta.toFixed(3)),
              rateApplied: `৳${ratePerHour} / ১ ঘণ্টা ওয়াচ টাইম`,
              status: 'completed',
              timestamp: new Date().toISOString()
            });
          }

          if (newTxns.length > 0) {
            setTransactions(prev => [...newTxns, ...prev]);
          }
        }
      }

      accounts[authorIndex] = author;
      localStorage.setItem('bashartube_registered_accounts', JSON.stringify(accounts));

      // If currently active user is this author, sync local session state
      if (currentUser && currentUser.id === author.id) {
        localStorage.setItem('bashartube_active_user', JSON.stringify(author));
      }
    } catch (e) {
      console.warn("Engagement calculation notice:", e);
    }

    return { counted: true };
  };

  // ==========================================
  // SUPER ADMIN ACTIONS
  // ==========================================

  // 1. Approve Monetization Application
  const approveMonetization = async (appId: string): Promise<{ success: boolean; message?: string }> => {
    const target = applications.find(a => a.id === appId);
    if (!target) return { success: false, message: 'আবেদন খুঁজে পাওয়া যায়নি।' };

    const updatedApps = applications.map(a => {
      if (a.id === appId) {
        return {
          ...a,
          status: 'approved' as const,
          reviewedAt: new Date().toISOString(),
          reviewerId: currentUser?.id || 'superadmin'
        };
      }
      return a;
    });
    setApplications(updatedApps);

    // Update Creator profile in registered accounts
    try {
      const accountsRaw = localStorage.getItem('bashartube_registered_accounts');
      if (accountsRaw) {
        const accounts: UserProfile[] = JSON.parse(accountsRaw);
        const idx = accounts.findIndex(acc => acc.id === target.creatorId);
        if (idx !== -1) {
          accounts[idx].monetizationStatus = 'monetized';
          accounts[idx].monetizationApprovedAt = new Date().toISOString();
          accounts[idx].availableBalance = accounts[idx].availableBalance || 0;
          accounts[idx].lifetimeEarnings = accounts[idx].lifetimeEarnings || 0;
          localStorage.setItem('bashartube_registered_accounts', JSON.stringify(accounts));

          if (currentUser && currentUser.id === target.creatorId) {
            await updateProfile({
              monetizationStatus: 'monetized',
              monetizationApprovedAt: new Date().toISOString()
            });
          }
        }
      }
      await updateDoc(doc(db, 'monetization_applications', appId), {
        status: 'approved',
        reviewedAt: new Date().toISOString()
      });
      await updateDoc(doc(db, 'users', target.creatorId), {
        monetizationStatus: 'monetized'
      });
    } catch {}

    return { 
      success: true, 
      message: `@${target.handle.replace('@', '')} চ্যানেলের মনিটাইজেশন সফলভাবে অনুমোদন করা হয়েছে!` 
    };
  };

  // 2. Reject Monetization Application
  const rejectMonetization = async (appId: string, reason: string): Promise<{ success: boolean; message?: string }> => {
    if (!reason.trim()) {
      return { success: false, message: 'প্রত্যাখ্যানের সুনির্দিষ্ট কারণ উল্লেখ করা বাধ্যতামূলক।' };
    }

    const target = applications.find(a => a.id === appId);
    if (!target) return { success: false, message: 'আবেদন খুঁজে পাওয়া যায়নি।' };

    const updatedApps = applications.map(a => {
      if (a.id === appId) {
        return {
          ...a,
          status: 'rejected' as const,
          rejectionReason: reason.trim(),
          reviewedAt: new Date().toISOString(),
          reviewerId: currentUser?.id || 'superadmin'
        };
      }
      return a;
    });
    setApplications(updatedApps);

    try {
      const accountsRaw = localStorage.getItem('bashartube_registered_accounts');
      if (accountsRaw) {
        const accounts: UserProfile[] = JSON.parse(accountsRaw);
        const idx = accounts.findIndex(acc => acc.id === target.creatorId);
        if (idx !== -1) {
          accounts[idx].monetizationStatus = 'rejected';
          accounts[idx].monetizationRejectionReason = reason.trim();
          localStorage.setItem('bashartube_registered_accounts', JSON.stringify(accounts));

          if (currentUser && currentUser.id === target.creatorId) {
            await updateProfile({
              monetizationStatus: 'rejected',
              monetizationRejectionReason: reason.trim()
            });
          }
        }
      }
      await updateDoc(doc(db, 'monetization_applications', appId), {
        status: 'rejected',
        rejectionReason: reason.trim(),
        reviewedAt: new Date().toISOString()
      });
    } catch {}

    return { 
      success: true, 
      message: `@${target.handle.replace('@', '')} চ্যানেলের আবেদন প্রত্যাখ্যাত হয়েছে এবং কারণ জানানো হয়েছে।` 
    };
  };

  // 3. Suspend or Reactivate Creator Monetization
  const toggleCreatorMonetization = async (creatorId: string, status: 'monetized' | 'suspended'): Promise<{ success: boolean; message?: string }> => {
    try {
      const accountsRaw = localStorage.getItem('bashartube_registered_accounts');
      if (accountsRaw) {
        const accounts: UserProfile[] = JSON.parse(accountsRaw);
        const idx = accounts.findIndex(acc => acc.id === creatorId);
        if (idx !== -1) {
          accounts[idx].monetizationStatus = status;
          localStorage.setItem('bashartube_registered_accounts', JSON.stringify(accounts));

          if (currentUser && currentUser.id === creatorId) {
            await updateProfile({ monetizationStatus: status });
          }
        }
      }
      await updateDoc(doc(db, 'users', creatorId), { monetizationStatus: status });
    } catch {}

    return { 
      success: true, 
      message: `ক্রিয়েটরের মনিটাইজেশন স্ট্যাটাস সফলভাবে '${status === 'monetized' ? 'সক্রিয়' : 'স্থগিত'}' করা হয়েছে।` 
    };
  };

  // 4. Approve bKash Withdrawal Request
  const approveWithdrawal = async (reqId: string, bKashTrxId: string): Promise<{ success: boolean; message?: string }> => {
    if (!bKashTrxId.trim()) {
      return { success: false, message: 'বিকাশ ট্রানজ্যাকশন আইডি (bKash TrxID) প্রদান করা বাধ্যতামূলক।' };
    }

    const target = withdrawals.find(w => w.id === reqId);
    if (!target) return { success: false, message: 'ক্যাশআউট রিকোয়েস্ট পাওয়া যায়নি।' };

    const updatedWithdrawals = withdrawals.map(w => {
      if (w.id === reqId) {
        return {
          ...w,
          status: 'approved' as const,
          bKashTrxId: bKashTrxId.trim(),
          processedAt: new Date().toISOString()
        };
      }
      return w;
    });
    setWithdrawals(updatedWithdrawals);

    // Record completed withdrawal in transactions
    const txnRecord: EarningTransaction = {
      id: 'txn_wth_' + Date.now(),
      creatorId: target.creatorId,
      type: 'withdrawal',
      amount: target.amount,
      validUnits: 1,
      rateApplied: 'bKash Cashout',
      status: 'completed',
      timestamp: new Date().toISOString(),
      bKashNumber: target.bKashNumber,
      bKashTrxId: bKashTrxId.trim(),
      note: `bKash TrxID: ${bKashTrxId.trim()}`
    };
    setTransactions(prev => [txnRecord, ...prev]);

    // Update creator profile balances
    try {
      const accountsRaw = localStorage.getItem('bashartube_registered_accounts');
      if (accountsRaw) {
        const accounts: UserProfile[] = JSON.parse(accountsRaw);
        const idx = accounts.findIndex(acc => acc.id === target.creatorId);
        if (idx !== -1) {
          accounts[idx].pendingWithdrawalBalance = Math.max(0, (accounts[idx].pendingWithdrawalBalance || 0) - target.amount);
          accounts[idx].totalWithdrawnBalance = (accounts[idx].totalWithdrawnBalance || 0) + target.amount;
          localStorage.setItem('bashartube_registered_accounts', JSON.stringify(accounts));

          if (currentUser && currentUser.id === target.creatorId) {
            await updateProfile({
              pendingWithdrawalBalance: accounts[idx].pendingWithdrawalBalance,
              totalWithdrawnBalance: accounts[idx].totalWithdrawnBalance
            });
          }
        }
      }
      await updateDoc(doc(db, 'withdrawals', reqId), {
        status: 'approved',
        bKashTrxId: bKashTrxId.trim(),
        processedAt: new Date().toISOString()
      });
    } catch {}

    return { 
      success: true, 
      message: `৳${target.amount.toLocaleString()} টাকার bKash ক্যাশআউট সফলভাবে অনুমোদিত হয়েছে (TrxID: ${bKashTrxId.trim()})।` 
    };
  };

  // 5. Reject bKash Withdrawal Request
  const rejectWithdrawal = async (reqId: string, reason: string): Promise<{ success: boolean; message?: string }> => {
    if (!reason.trim()) {
      return { success: false, message: 'প্রত্যাখ্যানের কারণ উল্লেখ করা আবশ্যক।' };
    }

    const target = withdrawals.find(w => w.id === reqId);
    if (!target) return { success: false, message: 'ক্যাশআউট রিকোয়েস্ট পাওয়া যায়নি।' };

    const updatedWithdrawals = withdrawals.map(w => {
      if (w.id === reqId) {
        return {
          ...w,
          status: 'rejected' as const,
          rejectionReason: reason.trim(),
          processedAt: new Date().toISOString()
        };
      }
      return w;
    });
    setWithdrawals(updatedWithdrawals);

    // Refund pending amount back to creator's available balance!
    try {
      const accountsRaw = localStorage.getItem('bashartube_registered_accounts');
      if (accountsRaw) {
        const accounts: UserProfile[] = JSON.parse(accountsRaw);
        const idx = accounts.findIndex(acc => acc.id === target.creatorId);
        if (idx !== -1) {
          accounts[idx].availableBalance = (accounts[idx].availableBalance || 0) + target.amount;
          accounts[idx].pendingWithdrawalBalance = Math.max(0, (accounts[idx].pendingWithdrawalBalance || 0) - target.amount);
          localStorage.setItem('bashartube_registered_accounts', JSON.stringify(accounts));

          if (currentUser && currentUser.id === target.creatorId) {
            await updateProfile({
              availableBalance: accounts[idx].availableBalance,
              pendingWithdrawalBalance: accounts[idx].pendingWithdrawalBalance
            });
          }
        }
      }
      await updateDoc(doc(db, 'withdrawals', reqId), {
        status: 'rejected',
        rejectionReason: reason.trim(),
        processedAt: new Date().toISOString()
      });
    } catch {}

    return { 
      success: true, 
      message: `ক্যাশআউট রিকোয়েস্ট প্রত্যাখ্যাত হয়েছে এবং ৳${target.amount.toLocaleString()} টাকা ক্রিয়েটরের ব্যালেন্সে ফেরত দেওয়া হয়েছে।` 
    };
  };

  // 6. Update Monetization Eligibility Thresholds & Fixed Rates (Admin Configuration)
  const updateMonetizationConfig = async (newConfig: Partial<MonetizationConfig>): Promise<{ success: boolean; message?: string }> => {
    const updated: MonetizationConfig = {
      ...monetizationConfig,
      ...newConfig,
      minViews: Number(newConfig.minViews !== undefined ? newConfig.minViews : monetizationConfig.minViews),
      minWatchHours: Number(newConfig.minWatchHours !== undefined ? newConfig.minWatchHours : monetizationConfig.minWatchHours),
      minFollowers: Number(newConfig.minFollowers !== undefined ? newConfig.minFollowers : monetizationConfig.minFollowers),
      ratePer1000Views: Number(newConfig.ratePer1000Views !== undefined ? newConfig.ratePer1000Views : monetizationConfig.ratePer1000Views),
      ratePerWatchHour: Number(newConfig.ratePerWatchHour !== undefined ? newConfig.ratePerWatchHour : monetizationConfig.ratePerWatchHour),
      minWithdrawalAmount: Number(newConfig.minWithdrawalAmount !== undefined ? newConfig.minWithdrawalAmount : monetizationConfig.minWithdrawalAmount)
    };

    setMonetizationConfig(updated);
    try {
      localStorage.setItem('bashartube_monetization_config', JSON.stringify(updated));
      await setDoc(doc(db, 'platform_settings', 'monetization'), updated, { merge: true });
    } catch {}

    return { 
      success: true, 
      message: 'মনিটাইজেশন যোগ্যতা ও আয়ের রেট সফলভাবে সংরক্ষিত ও কার্যকর করা হয়েছে!' 
    };
  };

  // 7. Reset Monetization Configuration to Default
  const resetMonetizationConfig = async (): Promise<{ success: boolean; message?: string }> => {
    setMonetizationConfig(DEFAULT_MONETIZATION_CONFIG);
    try {
      localStorage.setItem('bashartube_monetization_config', JSON.stringify(DEFAULT_MONETIZATION_CONFIG));
      await setDoc(doc(db, 'platform_settings', 'monetization'), DEFAULT_MONETIZATION_CONFIG, { merge: true });
    } catch {}
    return { success: true, message: 'ডিফল্ট মান সফলভাবে পুনরুদ্ধার করা হয়েছে।' };
  };

  return (
    <MonetizationContext.Provider value={{
      applications,
      withdrawals,
      transactions,
      antiFraudLogs,
      monetizationConfig,
      creatorMonetizationStatus,
      eligibilityMetrics,
      creatorTransactions,
      creatorWithdrawals,
      applyForMonetization,
      requestBKashWithdrawal,
      saveBKashSettings,
      recordRealEngagement,
      approveMonetization,
      rejectMonetization,
      toggleCreatorMonetization,
      approveWithdrawal,
      rejectWithdrawal,
      updateMonetizationConfig,
      resetMonetizationConfig
    }}>
      {children}
    </MonetizationContext.Provider>
  );
};

export const useMonetization = () => {
  const context = useContext(MonetizationContext);
  if (!context) {
    throw new Error('useMonetization must be used within a MonetizationProvider');
  }
  return context;
};

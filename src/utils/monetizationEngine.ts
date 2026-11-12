/**
 * Monetization Engine & Anti-Fraud Logic for BasharTube
 * Fixed rates: ৳10 per 1,000 valid views, ৳1 per 1 hour watch time.
 * Eligibility: 10 Crore (100M) views, 10,000 hours watch time, 10,000 followers.
 * Minimum bKash withdrawal: ৳10,000.
 */

export const MONETIZATION_MIN_VIEWS = 100_000_000; // 10 Crore (100 Million)
export const MONETIZATION_MIN_WATCH_HOURS = 10_000; // 10,000 Hours
export const MONETIZATION_MIN_FOLLOWERS = 10_000; // 10,000 Followers
export const MIN_WITHDRAWAL_AMOUNT = 10_000; // ৳10,000 Min via bKash

export const RATE_PER_1000_VIEWS = 10; // ৳10 BDT
export const RATE_PER_WATCH_HOUR = 1; // ৳1 BDT

export interface MonetizationConfig {
  minViews: number;
  minWatchHours: number;
  minFollowers: number;
  ratePer1000Views: number;
  ratePerWatchHour: number;
  minWithdrawalAmount: number;
}

export const DEFAULT_MONETIZATION_CONFIG: MonetizationConfig = {
  minViews: MONETIZATION_MIN_VIEWS,
  minWatchHours: MONETIZATION_MIN_WATCH_HOURS,
  minFollowers: MONETIZATION_MIN_FOLLOWERS,
  ratePer1000Views: RATE_PER_1000_VIEWS,
  ratePerWatchHour: RATE_PER_WATCH_HOUR,
  minWithdrawalAmount: MIN_WITHDRAWAL_AMOUNT
};

/**
 * Checks creator eligibility progress against configurable thresholds
 */
export function checkMonetizationEligibility(
  validViews: number, 
  validWatchHours: number, 
  followers: number,
  config?: Partial<MonetizationConfig>
) {
  const activeMinViews = config?.minViews ?? MONETIZATION_MIN_VIEWS;
  const activeMinHours = config?.minWatchHours ?? MONETIZATION_MIN_WATCH_HOURS;
  const activeMinFollowers = config?.minFollowers ?? MONETIZATION_MIN_FOLLOWERS;

  const safeViews = Math.max(0, validViews || 0);
  const safeHours = Math.max(0, validWatchHours || 0);
  const safeFollowers = Math.max(0, followers || 0);

  const viewsProgress = activeMinViews > 0 ? Math.min(100, (safeViews / activeMinViews) * 100) : 100;
  const watchHoursProgress = activeMinHours > 0 ? Math.min(100, (safeHours / activeMinHours) * 100) : 100;
  const followersProgress = activeMinFollowers > 0 ? Math.min(100, (safeFollowers / activeMinFollowers) * 100) : 100;

  const isEligible = 
    safeViews >= activeMinViews &&
    safeHours >= activeMinHours &&
    safeFollowers >= activeMinFollowers;

  return {
    isEligible,
    viewsProgress: Number(viewsProgress.toFixed(2)),
    watchHoursProgress: Number(watchHoursProgress.toFixed(2)),
    followersProgress: Number(followersProgress.toFixed(2)),
    remainingViews: Math.max(0, activeMinViews - safeViews),
    remainingWatchHours: Math.max(0, activeMinHours - safeHours),
    remainingFollowers: Math.max(0, activeMinFollowers - safeFollowers),
    targetViews: activeMinViews,
    targetWatchHours: activeMinHours,
    targetFollowers: activeMinFollowers
  };
}

/**
 * Calculates earnings from valid views with configurable rate
 */
export function calculateViewsIncome(validViews: number, ratePer1000?: number): number {
  if (!validViews || validViews <= 0) return 0;
  const rate = ratePer1000 !== undefined ? ratePer1000 : RATE_PER_1000_VIEWS;
  return Number(((validViews / 1000) * rate).toFixed(2));
}

/**
 * Calculates earnings from valid watch time hours with configurable rate
 */
export function calculateWatchTimeIncome(validWatchHours: number, ratePerHour?: number): number {
  if (!validWatchHours || validWatchHours <= 0) return 0;
  const rate = ratePerHour !== undefined ? ratePerHour : RATE_PER_WATCH_HOUR;
  return Number((validWatchHours * rate).toFixed(2));
}

/**
 * Calculates combined total earnings from views and watch time with configurable rates
 */
export function calculateTotalIncome(
  validViews: number, 
  validWatchHours: number, 
  config?: Partial<MonetizationConfig>
): number {
  const viewsIncome = calculateViewsIncome(validViews, config?.ratePer1000Views);
  const watchIncome = calculateWatchTimeIncome(validWatchHours, config?.ratePerWatchHour);
  return Number((viewsIncome + watchIncome).toFixed(2));
}

/**
 * Validates a Bangladeshi bKash 11-digit wallet number
 */
export function validateBKashNumber(phone: string): { isValid: boolean; error?: string } {
  if (!phone) {
    return { isValid: false, error: 'বিকাশ নম্বর প্রদান করা আবশ্যক।' };
  }
  const clean = phone.replace(/[\s\-]/g, '');
  const bkashRegex = /^01[3-9]\d{8}$/;
  if (!bkashRegex.test(clean)) {
    return { 
      isValid: false, 
      error: 'সঠিক ১১ ডিজিটের বাংলাদেশি বিকাশ নম্বর লিখুন (যেমন: 017XXXXXXXX, 018XXXXXXXX, 019XXXXXXXX)।' 
    };
  }
  return { isValid: true };
}

/**
 * Anti-Fraud & Bot Detection Heuristics
 * Filters out fake views, scrapers, and bot looping
 */
export function detectSuspiciousEngagement(
  watchSeconds: number,
  userAgent?: string,
  recentViewCountFromSameIp?: number
): { isValid: boolean; reason?: string } {
  // 1. Bot bounce check: Less than 3 seconds is considered fake/automated hit
  if (watchSeconds < 3) {
    return { isValid: false, reason: 'ভিউয়ের স্থায়িত্ব ৩ সেকেন্ডের কম (অস্বাভাবিক বাউন্স)।' };
  }

  // 2. User Agent bot pattern detection
  if (userAgent) {
    const lowerUa = userAgent.toLowerCase();
    if (
      lowerUa.includes('bot') || 
      lowerUa.includes('spider') || 
      lowerUa.includes('crawler') ||
      lowerUa.includes('headless') ||
      lowerUa.includes('phantomjs')
    ) {
      return { isValid: false, reason: 'স্বয়ংক্রিয় বট বা স্ক্র্যাপার ট্রাফিক সনাক্ত হয়েছে।' };
    }
  }

  // 3. IP view burst check (looping attacks)
  if (recentViewCountFromSameIp && recentViewCountFromSameIp > 40) {
    return { isValid: false, reason: 'একই আইপি বা ডিভাইস থেকে অস্বাভাবিক ভিউ স্পাইক শনাক্ত হয়েছে।' };
  }

  return { isValid: true };
}

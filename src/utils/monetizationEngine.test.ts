import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  checkMonetizationEligibility, 
  calculateViewsIncome, 
  calculateWatchTimeIncome, 
  calculateTotalIncome, 
  validateBKashNumber, 
  detectSuspiciousEngagement,
  MONETIZATION_MIN_VIEWS,
  MONETIZATION_MIN_WATCH_HOURS,
  MONETIZATION_MIN_FOLLOWERS
} from './monetizationEngine';

test('checkMonetizationEligibility evaluates thresholds accurately', () => {
  // Not eligible: views low
  const res1 = checkMonetizationEligibility(50_000_000, 12_000, 15_000);
  assert.equal(res1.isEligible, false);
  assert.equal(res1.viewsProgress, 50);
  assert.equal(res1.remainingViews, 50_000_000);

  // Not eligible: watch hours low
  const res2 = checkMonetizationEligibility(100_000_000, 8_000, 10_000);
  assert.equal(res2.isEligible, false);
  assert.equal(res2.remainingWatchHours, 2_000);

  // Fully eligible (10 Crore views, 10,000 hours, 10,000 followers)
  const res3 = checkMonetizationEligibility(100_000_000, 10_000, 10_000);
  assert.equal(res3.isEligible, true);
  assert.equal(res3.viewsProgress, 100);
  assert.equal(res3.watchHoursProgress, 100);
  assert.equal(res3.followersProgress, 100);
  assert.equal(res3.remainingViews, 0);
  assert.equal(res3.remainingWatchHours, 0);
  assert.equal(res3.remainingFollowers, 0);
});

test('calculateViewsIncome adheres strictly to ৳10 per 1,000 valid views', () => {
  assert.equal(calculateViewsIncome(1_000), 10);
  assert.equal(calculateViewsIncome(10_000), 100);
  assert.equal(calculateViewsIncome(100_000_000), 1_000_000); // 10 Crore views = ৳10 Lakh
  assert.equal(calculateViewsIncome(0), 0);
});

test('calculateWatchTimeIncome adheres strictly to ৳1 per 1 hour watch time', () => {
  assert.equal(calculateWatchTimeIncome(1), 1);
  assert.equal(calculateWatchTimeIncome(10_000), 10_000); // 10,000 hours = ৳10,000
  assert.equal(calculateWatchTimeIncome(0), 0);
});

test('calculateTotalIncome sums views and watch time correctly', () => {
  // 5,000 views (৳50) + 10 hours watch time (৳10) = ৳60
  assert.equal(calculateTotalIncome(5_000, 10), 60);
});

test('validateBKashNumber validates 11-digit Bangladeshi mobile formats', () => {
  assert.equal(validateBKashNumber('01712345678').isValid, true);
  assert.equal(validateBKashNumber('01898765432').isValid, true);
  assert.equal(validateBKashNumber('01911223344').isValid, true);
  assert.equal(validateBKashNumber('01511223344').isValid, true);

  // Invalid cases
  assert.equal(validateBKashNumber('01234567890').isValid, false); // invalid operator prefix
  assert.equal(validateBKashNumber('0171234').isValid, false); // too short
  assert.equal(validateBKashNumber('abcd').isValid, false);
  assert.equal(validateBKashNumber('').isValid, false);
});

test('detectSuspiciousEngagement rejects fake views and bots', () => {
  // Bounce < 3s rejected
  assert.equal(detectSuspiciousEngagement(2).isValid, false);
  // Real view >= 3s accepted
  assert.equal(detectSuspiciousEngagement(15).isValid, true);

  // Headless crawler user agent rejected
  assert.equal(detectSuspiciousEngagement(20, 'Googlebot/2.1').isValid, false);
  assert.equal(detectSuspiciousEngagement(20, 'HeadlessChrome').isValid, false);

  // IP burst spam rejected
  assert.equal(detectSuspiciousEngagement(20, 'Mozilla/5.0', 45).isValid, false);
});

test('checkMonetizationEligibility and calculateTotalIncome respect dynamic MonetizationConfig', () => {
  const customConfig = {
    minViews: 50_000,
    minWatchHours: 500,
    minFollowers: 1_000,
    ratePer1000Views: 20, // ৳20 per 1,000 views
    ratePerWatchHour: 2,  // ৳2 per 1 hour
    minWithdrawalAmount: 5_000
  };

  // Check custom eligibility
  const res = checkMonetizationEligibility(50_000, 500, 1_000, customConfig);
  assert.equal(res.isEligible, true);
  assert.equal(res.viewsProgress, 100);
  assert.equal(res.watchHoursProgress, 100);
  assert.equal(res.followersProgress, 100);
  assert.equal(res.targetViews, 50_000);

  // Check custom earnings rates
  // 5,000 views at ৳20/1k = ৳100 + 10 hours at ৳2/hr = ৳20 => Total ৳120
  const income = calculateTotalIncome(5_000, 10, customConfig);
  assert.equal(income, 120);
});


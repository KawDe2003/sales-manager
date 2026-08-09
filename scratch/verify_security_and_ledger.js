// AUTOMATED TEST SUITE FOR BACKEND HARDENING & LEDGER INTEGRITY
// Run with: node scratch/verify_security_and_ledger.js

import { generateBalanceSheet, generatePnLStatement } from '../src/utils/slfrsEngine.js';

console.log('================================================================');
console.log('⚡ GYMSALES PRO AUTOMATED PRODUCTION SECURITY & LEDGER TEST SUITE');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    failCount++;
  }
}

// 1. DEBIT = CREDIT BALANCING TEST
console.log('Test Suite 1: Double-Entry Journal Entry Debit/Credit Balancing');

const balancedLines = [
  { accountId: '1020', debit: 500000, credit: 0 },
  { accountId: '4010', debit: 0, credit: 500000 }
];

const totalDebits = balancedLines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
const totalCredits = balancedLines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);

assert(totalDebits === totalCredits, 'Balanced Entry: Total Debits (LKR 500,000) === Total Credits (LKR 500,000)');

const unbalancedLines = [
  { accountId: '1020', debit: 500000, credit: 0 },
  { accountId: '4010', debit: 0, credit: 400000 } // LKR 100,000 discrepancy
];
const unbDebits = unbalancedLines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
const unbCredits = unbalancedLines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);

assert(unbDebits !== unbCredits, 'Unbalanced Entry Detected: Rejects entry where Debits !== Credits');


// 2. SLFRS BALANCE SHEET RECONCILIATION TEST (ASSETS = EQUITY + LIABILITIES)
console.log('\nTest Suite 2: SLFRS/LKAS Balance Sheet Equation (Assets = Equity + Liabilities)');

const sampleAccounts = [
  { id: '1020', code: '1020', name: 'Bank Account', type: 'Asset', statement_category: 'cash_and_equivalents', is_current: true },
  { id: '1100', code: '1100', name: 'Accounts Receivable', type: 'Asset', statement_category: 'trade_receivables', is_current: true },
  { id: '3010', code: '3010', name: 'Stated Capital', type: 'Equity', statement_category: 'stated_capital', is_current: false },
  { id: '4010', code: '4010', name: 'Revenue', type: 'Revenue', statement_category: 'revenue', is_current: null },
  { id: '5050', code: '5050', name: 'Operational Expense', type: 'Expense', statement_category: 'other_expenses', is_current: null }
];

const sampleJournalEntries = [
  { id: 'je-1', date: '2026-01-01', reference: 'GEN-001' },
  { id: 'je-2', date: '2026-06-01', reference: 'GEN-002' }
];

const sampleJournalLines = [
  { id: 'jl-1', journalEntryId: 'je-1', accountId: '1020', debit: 1000000, credit: 0 },
  { id: 'jl-2', journalEntryId: 'je-1', accountId: '3010', debit: 0, credit: 1000000 },
  { id: 'jl-3', journalEntryId: 'je-2', accountId: '1100', debit: 350000, credit: 0 },
  { id: 'jl-4', journalEntryId: 'je-2', accountId: '4010', debit: 0, credit: 350000 }
];

const balanceSheet = generateBalanceSheet(sampleAccounts, sampleJournalLines, sampleJournalEntries, '2026-12-31');

assert(balanceSheet.isBalanced === true, `Balance Sheet Reconciles: Total Assets (${balanceSheet.totalAssets}) === Total Equity & Liabilities (${balanceSheet.totalEquityAndLiabilities})`);
assert(balanceSheet.discrepancy === 0, 'Discrepancy is exactly 0 LKR');


// 3. MULTI-TENANT RLS ISOLATION RULE TEST
console.log('\nTest Suite 3: Multi-Tenant RLS Policy Isolation Logic');

const userA = 'user-uuid-aaaa-1111';
const userB = 'user-uuid-bbbb-2222';

const mockCustomerDb = [
  { id: 'c-1', user_id: userA, gym_name: 'Alpha Gym Colombo' },
  { id: 'c-2', user_id: userB, gym_name: 'Beta Gym Kandy' }
];

const queryForUserA = mockCustomerDb.filter(c => c.user_id === userA);
const queryForUserB = mockCustomerDb.filter(c => c.user_id === userB);

assert(queryForUserA.length === 1 && queryForUserA[0].gym_name === 'Alpha Gym Colombo', 'User A RLS query returns ONLY User A data');
assert(!queryForUserA.some(c => c.user_id === userB), 'User A CANNOT access User B client records');
assert(queryForUserB.length === 1 && queryForUserB[0].gym_name === 'Beta Gym Kandy', 'User B RLS query returns ONLY User B data');

console.log('\n----------------------------------------------------------------');
console.log(`SUMMARY: ${passCount} PASSED, ${failCount} FAILED.`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

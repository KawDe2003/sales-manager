/**
 * SLFRS/LKAS Financial Statement Computation Engine
 * Formatted per Sri Lanka Accounting Standards (LKAS 1 & LKAS 7).
 * Reads EXCLUSIVELY from general ledger accounts, journalEntries, and journalLines.
 */

// Helper to filter journal lines by date range
export const filterLinesByPeriod = (journalLines = [], journalEntries = [], startDate, endDate) => {
  const entryMap = new Map((journalEntries || []).map(e => [e.id, e.date]));
  return (journalLines || []).filter(line => {
    const entryDate = entryMap.get(line.journalEntryId);
    if (!entryDate) return false;
    if (startDate && entryDate < startDate) return false;
    if (endDate && entryDate > endDate) return false;
    return true;
  });
};

// Helper to calculate Net Account Balance as of a given date (or within period)
export const calculateCategoryNet = (lines = [], accounts = [], categoryKey) => {
  const catAccounts = (accounts || []).filter(a => a.statement_category === categoryKey);
  const catIds = new Set(catAccounts.map(a => a.id));
  
  let net = 0;
  lines.forEach(l => {
    if (catIds.has(l.accountId)) {
      const acc = catAccounts.find(a => a.id === l.accountId);
      const deb = Number(l.debit || 0);
      const cred = Number(l.credit || 0);
      
      if (acc?.type === 'revenue' || acc?.type === 'liability' || acc?.type === 'equity') {
        net += (cred - deb);
      } else {
        net += (deb - cred);
      }
    }
  });
  return net;
};

// 1. STATEMENT OF PROFIT OR LOSS (LKAS 1)
export const generatePnLStatement = ({ accounts = [], journalEntries = [], journalLines = [], startDate, endDate, priorStartDate, priorEndDate }) => {
  const currentLines = filterLinesByPeriod(journalLines, journalEntries, startDate, endDate);
  const priorLines = (priorStartDate && priorEndDate) ? filterLinesByPeriod(journalLines, journalEntries, priorStartDate, priorEndDate) : [];

  const getNet = (lines, cat) => calculateCategoryNet(lines, accounts, cat);

  const buildPeriodPnL = (lines) => {
    const revenue = getNet(lines, 'revenue');
    const costOfSales = getNet(lines, 'cost_of_sales');
    const grossProfit = revenue - costOfSales;

    const otherIncome = getNet(lines, 'other_income');
    const distributionCosts = getNet(lines, 'distribution_costs');
    const adminExpenses = getNet(lines, 'administrative_expenses');
    const otherExpenses = getNet(lines, 'other_expenses');

    const operatingProfit = grossProfit + otherIncome - distributionCosts - adminExpenses - otherExpenses;

    const financeIncome = getNet(lines, 'finance_income');
    const financeCosts = getNet(lines, 'finance_costs');

    const profitBeforeTax = operatingProfit + financeIncome - financeCosts;
    const taxExpense = getNet(lines, 'tax_expense');

    const profitForPeriod = profitBeforeTax - taxExpense;

    // Disclosed Depreciation within Admin Expenses
    const depAccounts = (accounts || []).filter(a => a.statement_category === 'administrative_expenses' && (a.name.toLowerCase().includes('depreciation') || a.code === '5040'));
    const depIds = new Set(depAccounts.map(a => a.id));
    const depreciationDisclosed = lines.filter(l => depIds.has(l.accountId)).reduce((s, l) => s + (Number(l.debit || 0) - Number(l.credit || 0)), 0);

    return {
      revenue,
      costOfSales,
      grossProfit,
      otherIncome,
      distributionCosts,
      adminExpenses,
      otherExpenses,
      operatingProfit,
      financeIncome,
      financeCosts,
      profitBeforeTax,
      taxExpense,
      profitForPeriod,
      depreciationDisclosed
    };
  };

  return {
    current: buildPeriodPnL(currentLines),
    prior: buildPeriodPnL(priorLines)
  };
};

// 2. STATEMENT OF FINANCIAL POSITION / BALANCE SHEET (LKAS 1)
export const generateBalanceSheet = ({ accounts = [], journalEntries = [], journalLines = [], endDate, pnlProfitForPeriod = 0 }) => {
  const cumulativeLines = filterLinesByPeriod(journalLines, journalEntries, null, endDate);

  const getEndingBalance = (catKey) => calculateCategoryNet(cumulativeLines, accounts, catKey);

  // Non-Current Assets
  const ppeGross = getEndingBalance('ppe');
  const accumDep = getEndingBalance('accumulated_depreciation');
  const ppeNet = ppeGross - accumDep;
  const intangibles = getEndingBalance('intangible_assets');
  const totalNonCurrentAssets = ppeNet + intangibles;

  // Current Assets
  const inventory = getEndingBalance('inventory');
  const tradeReceivables = getEndingBalance('trade_receivables');
  const cashAndEquivalents = getEndingBalance('cash_and_equivalents');
  const totalCurrentAssets = inventory + tradeReceivables + cashAndEquivalents;

  const totalAssets = totalNonCurrentAssets + totalCurrentAssets;

  // Equity
  const statedCapital = getEndingBalance('stated_capital');
  const openingRetained = getEndingBalance('retained_earnings');
  const drawings = getEndingBalance('drawings');
  const retainedEarningsRolled = openingRetained + pnlProfitForPeriod - drawings;
  const totalEquity = statedCapital + retainedEarningsRolled;

  // Non-Current Liabilities
  const longTermLoans = getEndingBalance('long_term_loans');
  const totalNonCurrentLiabilities = longTermLoans;

  // Current Liabilities
  const tradePayables = getEndingBalance('trade_payables');
  const taxPayable = getEndingBalance('tax_payable');
  const shortTermBorrowings = getEndingBalance('short_term_borrowings');
  const totalCurrentLiabilities = tradePayables + taxPayable + shortTermBorrowings;

  const totalEquityAndLiabilities = totalEquity + totalNonCurrentLiabilities + totalCurrentLiabilities;

  const isBalanced = Math.abs(totalAssets - totalEquityAndLiabilities) < 0.01;
  const discrepancy = totalAssets - totalEquityAndLiabilities;

  return {
    nonCurrentAssets: { ppeGross, accumDep, ppeNet, intangibles, total: totalNonCurrentAssets },
    currentAssets: { inventory, tradeReceivables, cashAndEquivalents, total: totalCurrentAssets },
    totalAssets,
    equity: { statedCapital, openingRetained, drawings, retainedEarningsRolled, total: totalEquity },
    nonCurrentLiabilities: { longTermLoans, total: totalNonCurrentLiabilities },
    currentLiabilities: { tradePayables, taxPayable, shortTermBorrowings, total: totalCurrentLiabilities },
    totalEquityAndLiabilities,
    isBalanced,
    discrepancy
  };
};

// 3. STATEMENT OF CASH FLOWS (LKAS 7 - INDIRECT METHOD)
export const generateCashFlowStatement = ({ accounts = [], journalEntries = [], journalLines = [], startDate, endDate, pnlStatement, balanceSheet }) => {
  const currentLines = filterLinesByPeriod(journalLines, journalEntries, startDate, endDate);
  
  // Calculate opening balance sheet as of day before startDate
  const dayBeforeStart = startDate ? new Date(new Date(startDate).getTime() - 86400000).toISOString().split('T')[0] : null;
  const openingBS = generateBalanceSheet({ accounts, journalEntries, journalLines, endDate: dayBeforeStart, pnlProfitForPeriod: 0 });

  const pbt = pnlStatement?.current?.profitBeforeTax || 0;
  const depreciation = pnlStatement?.current?.depreciationDisclosed || 0;
  const financeCosts = pnlStatement?.current?.financeCosts || 0;

  const operatingProfitBeforeWC = pbt + depreciation + financeCosts;

  // Working Capital Movements: (Opening - Closing) for Assets, (Closing - Opening) for Liabilities
  const deltaReceivables = openingBS.currentAssets.tradeReceivables - balanceSheet.currentAssets.tradeReceivables;
  const deltaInventory = openingBS.currentAssets.inventory - balanceSheet.currentAssets.inventory;
  const deltaPayables = balanceSheet.currentLiabilities.tradePayables - openingBS.currentLiabilities.tradePayables;

  const cashGeneratedFromOps = operatingProfitBeforeWC + deltaReceivables + deltaInventory + deltaPayables;
  const taxPaid = pnlStatement?.current?.taxExpense || 0;
  const netCashOperating = cashGeneratedFromOps - taxPaid;

  // Investing Activities
  const ppePurchase = Math.max(0, balanceSheet.nonCurrentAssets.ppeGross - openingBS.nonCurrentAssets.ppeGross);
  const netCashInvesting = -ppePurchase;

  // Financing Activities
  const loanProceeds = Math.max(0, (balanceSheet.nonCurrentLiabilities.longTermLoans + balanceSheet.currentLiabilities.shortTermBorrowings) - (openingBS.nonCurrentLiabilities.longTermLoans + openingBS.currentLiabilities.shortTermBorrowings));
  const loanRepayments = Math.max(0, (openingBS.nonCurrentLiabilities.longTermLoans + openingBS.currentLiabilities.shortTermBorrowings) - (balanceSheet.nonCurrentLiabilities.longTermLoans + balanceSheet.currentLiabilities.shortTermBorrowings));
  const drawingsPaid = balanceSheet.equity.drawings;

  const netCashFinancing = loanProceeds - loanRepayments - drawingsPaid;

  const netIncreaseInCash = netCashOperating + netCashInvesting + netCashFinancing;
  const cashAtBeginning = openingBS.currentAssets.cashAndEquivalents;
  const cashAtEndCalculated = cashAtBeginning + netIncreaseInCash;
  const cashAtEndActual = balanceSheet.currentAssets.cashAndEquivalents;

  const isReconciled = Math.abs(cashAtEndCalculated - cashAtEndActual) < 0.01;
  const cashDiscrepancy = cashAtEndCalculated - cashAtEndActual;

  return {
    operating: {
      pbt,
      depreciation,
      financeCosts,
      operatingProfitBeforeWC,
      deltaReceivables,
      deltaInventory,
      deltaPayables,
      cashGeneratedFromOps,
      taxPaid,
      netCashOperating
    },
    investing: {
      ppePurchase,
      netCashInvesting
    },
    financing: {
      loanProceeds,
      loanRepayments,
      drawingsPaid,
      netCashFinancing
    },
    netIncreaseInCash,
    cashAtBeginning,
    cashAtEndCalculated,
    cashAtEndActual,
    isReconciled,
    cashDiscrepancy
  };
};

# GymSales Pro Enterprise (SLFRS/LKAS Edition)

**GymSales Pro Enterprise** is a B2B Sales Management CRM, Billing Engine, and Sri Lanka Accounting Standards (SLFRS/LKAS) Financial Statements Suite engineered for gym software vendors, fitness center franchises, and accountants.

---

## 1. System Overview & Technology Stack

- **Framework**: React 18 + Vite (ESBuild)
- **Database & Sync**: Cloud-first Supabase PostgreSQL with local mirror state (`StoreContext.jsx`)
- **Financial Architecture**: Double-Entry General Ledger (`accounts`, `journalEntries`, `journalLines`)
- **Accounting Compliance**: Sri Lanka Accounting Standards (**LKAS 1** & **LKAS 7**)
- **Styling Methodology**: Pure Vanilla CSS using custom CSS Variable design tokens (`index.css`)
- **Document Export**: PDF document generation via `jsPDF` & `jspdf-autotable`
- **UI Icons**: `lucide-react`

---

## 2. Financial Statements Suite (SLFRS / LKAS Compliant)

All financial statement figures are computed **exclusively** from general ledger `journalLines` grouped by account `statement_category` to ensure full general ledger reconcilability:

### 1. Statement of Profit or Loss (per LKAS 1)
```
Revenue                                              LKR xxx
Cost of Sales                                        (xxx)
------------------------------------------------------------
Gross Profit                                          xxx

Other Income                                           xxx
Distribution Costs                                    (xxx)
Administrative Expenses                                (xxx)
Other Expenses                                         (xxx)
------------------------------------------------------------
Operating Profit                                       xxx

Finance Income                                          xxx
Finance Costs                                          (xxx)
------------------------------------------------------------
Profit Before Tax                                       xxx

Income Tax Expense                                     (xxx)
------------------------------------------------------------
Profit for the Period                                    xxx
```
- **Comparatives**: Side-by-side prior comparative period column.
- **LKAS 1 Rules**: Discloses Depreciation & Amortisation within Administrative Expenses notes; labeled **Profit Before Tax** (not EBITDA).

### 2. Statement of Financial Position / Balance Sheet (per LKAS 1)
- **Asset & Liability Classification**: Grouped into Current vs Non-Current based on `account.is_current`.
- **Automatic Retained Earnings Roll-Forward**:
  $$\text{Retained Earnings}_{\text{End}} = \text{Opening Retained Earnings} + \text{Profit for Period} - \text{Drawings/Dividends}$$
- **Balance Validation**: Validates $\text{TOTAL ASSETS} = \text{TOTAL EQUITY AND LIABILITIES}$. Renders a prominent error banner if unbalanced.

### 3. Statement of Cash Flows (per LKAS 7 - Indirect Method)
- **Operating Activities**: Starts from Profit Before Tax, adjusting for non-cash items (Depreciation, Finance Costs) and working capital movements ($\Delta\text{Receivables}$, $\Delta\text{Inventory}$, $\Delta\text{Payables}$).
- **Investing & Financing Activities**: PPE purchases/sales, loan proceeds/repayments, owner drawings.
- **Ledger Cash Reconciliation**: Reconciles ending cash against sum of Cash + Bank ledger balances (`1010` & `1020`), flagging any discrepancy.

---

## 3. Core UI Design & Component System

### Theming System (`index.css`)
Styled using custom CSS variables supporting Light and Dark modes:
- `--bg-primary`, `--bg-secondary`, `--panel-bg`, `--panel-border`
- `--accent-primary` (`#6366f1`), `--success` (`#10b981`), `--warning` (`#f59e0b`), `--danger` (`#ef4444`)

### CustomSelect Component (`src/components/CustomSelect.jsx`)
- Custom popover dropdown system replacing rectangular native OS popups.
- Matches theme border-radius (`var(--radius-md)` / `12px`), glassmorphic backdrop, `modalPop` entrance animation, hover translations, and active item green checkmarks (`✓`).

### Brand Dual-Ring Loading System (`index.css` & `App.jsx`)
- `.brand-loader-logo`: Pulsing 3D glassmorphic brand badge.
- `.spinner-outer` & `.spinner-inner`: Counter-rotating dual-ring orbit loader.
- `.loader-track` & `.loader-bar`: Shimmering progress indicator.

---

## 4. SMS Communications Gateway

- Integrated SMS gateway for bulk promotional broadcasts, renewal reminders, payment receipts, and debtor nudges.
- Dynamic template placeholder replacement: `{name}`, `{gym}`, `{amount}`, `{dueDate}`, `{invoiceNumber}`, `{link}`.
- Live credit balance tracker with Sender SID branding (`SEYNEX`).

---

## 5. Getting Started & Development Commands

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Run production build validation
npx vite build
```

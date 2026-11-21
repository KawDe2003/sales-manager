# Seynex Sales Manager & GymSales Pro Enterprise
## Complete Technical Architecture, System Documentation & User Manual

> **Version:** 2.4.0 (Enterprise SLFRS/LKAS & Biometric Cloud Push Edition)  
> **Target Audience:** Gym Software Vendors, Enterprise Sales Teams, Facility Managers, Financial Controllers, and Full-Stack Engineers.  
> **Last Updated:** November 2026

---

## Table of Contents
1. [Executive Summary & High-Level Architecture](#1-executive-summary--high-level-architecture)
2. [Technology Stack & Dependencies](#2-technology-stack--dependencies)
3. [System Architecture & Data Flow](#3-system-architecture--data-flow)
4. [Comprehensive Module Directory](#4-comprehensive-module-directory)
   - [4.1 Executive Dashboard (`/`)](#41-executive-dashboard-)
   - [4.2 CRM & B2B Sales Pipeline (`/leads`)](#42-crm--b2b-sales-pipeline-leads)
   - [4.3 Gym Client & Facility Management (`/customers`)](#43-gym-client--facility-management-customers)
   - [4.4 Client Portal & Document Sharing (`/portal`, `/pay`, `/share`)](#44-client-portal--document-sharing-portal-pay-share)
   - [4.5 Quotations Engine (`/quotations`)](#45-quotations-engine-quotations)
   - [4.6 Invoicing & Recurring Billing (`/invoices`)](#46-invoicing--recurring-billing-invoices)
   - [4.7 Payments & Multi-Channel Settlement (`/payments`)](#47-payments--multi-channel-settlement-payments)
   - [4.8 Debtors Aging & Recovery (`/debtors`)](#48-debtors-aging--recovery-debtors)
   - [4.9 Operational Expenses (`/expenses`)](#49-operational-expenses-expenses)
   - [4.10 Fixed Assets Register (LKAS 16) (`/assets`)](#410-fixed-assets-register-lkas-16-assets)
   - [4.11 Procurement & Vendor Accounts (`/procurement`)](#411-procurement--vendor-accounts-procurement)
   - [4.12 Product & Hardware Inventory (`/inventory`)](#412-product--hardware-inventory-inventory)
   - [4.13 Human Resources & Payroll Suite (`/hr`)](#413-human-resources--payroll-suite-hr)
   - [4.14 SLFRS / LKAS Double-Entry General Ledger (`/ledger`)](#414-slfrs--lkas-double-entry-general-ledger-ledger)
   - [4.15 Biometric Cloud Push Portal & Turnstile Fleet (`/cloud-push`)](#415-biometric-cloud-push-portal--turnstile-fleet-cloud-push)
   - [4.16 QuickSend SMS Communications Gateway (`/sms`)](#416-quicksend-sms-communications-gateway-sms)
   - [4.17 Operations Tasks & Activity Management (`/tasks`)](#417-operations-tasks--activity-management-tasks)
   - [4.18 Audit Logs & Security Trails (`/logs`)](#418-audit-logs--security-trails-logs)
   - [4.19 System Administration & Branding (`/settings`)](#419-system-administration--branding-settings)
5. [Biometric Hardware Fleet & Cloud Push Deep Dive](#5-biometric-hardware-fleet--cloud-push-deep-dive)
6. [SLFRS / LKAS Sri Lanka Accounting Engine Deep Dive](#6-slfrs--lkas-sri-lanka-accounting-engine-deep-dive)
7. [Design System & UI/UX Tokens](#7-design-system--uiux-tokens)
8. [Data Models & Schema Reference](#8-data-models--schema-reference)
9. [API Integrations & Serverless Proxies](#9-api-integrations--serverless-proxies)
10. [Installation, Local Development & Deployment](#10-installation-local-development--deployment)
11. [Role-Based Access Control (RBAC) & Security](#11-role-based-access-control-rbac--security)

---

## 1. Executive Summary & High-Level Architecture

**Seynex Sales Manager (GymSales Pro Enterprise)** is an all-in-one Enterprise Resource Planning (ERP), CRM, Biometric Hardware Telemetry Gateway, and Sri Lanka Accounting Standards (SLFRS/LKAS) Financial Accounting Suite.

The application is tailored for:
1. **Gym Management Software Vendors & Franchise Operators**: Centralized billing of client gyms based on live active gym members tracked via hardware turnstiles.
2. **Turnstile & Biometric Fleet Operators**: Hardware monitoring, multi-turnstile fleet management (Entrance/Exit IN/OUT pairings), live punch stream inspection, and remote over-the-air device dispatch.
3. **Financial Controllers & Accountants**: Fully reconciled double-entry accounting with automatic generation of LKAS 1 (Profit or Loss, Financial Position) and LKAS 7 (Cash Flows) statutory statements.
4. **Operations & HR Teams**: Complete statutory EPF/ETF payroll calculation, task delegation, and customer engagement through automated SMS gateways.

---

## 2. Technology Stack & Dependencies

### Core Frontend & Framework
- **Runtime & Build Tool**: Node.js & Vite 6.0 (`vite build` / ESBuild)
- **UI Framework**: React 19 (`react` ^19.2.4, `react-dom` ^19.2.4)
- **Routing**: React Router DOM v7 (`react-router-dom` ^7.14.0) with protected role-based routes
- **Icons**: Lucide React (`lucide-react` ^1.7.0) — Modern SVG icon set
- **Data Visualization**: Recharts (`recharts` ^3.8.1) — Responsive SVG charts (Area, Bar, Pie)
- **PDF Generation**: `jspdf` (^4.2.1) & `jspdf-autotable` (^5.0.7) for high-resolution client invoices, billing statements, and payroll slips
- **Spreadsheets & Data Export**: `xlsx` (^0.18.5) — Native client-side XLSX/CSV generation
- **State Management**: React Context API (`StoreContext.jsx`, `AuthContext.jsx`) with multi-layer synchronization (Supabase Cloud + LocalStorage resilience)

### Backend & Cloud Infrastructure
- **Primary Database**: Supabase PostgreSQL with real-time row-level security (RLS)
- **Serverless API Layer**: Vercel Serverless Functions (`/api/etechno.js`, `/api/quicksend.js`, `/api/health.js`)
- **Third-Party Telemetry**: eTechno Biometric Cloud Push Server (`http://83.147.38.130:666`)
- **SMS Gateway**: QuickSend HTTP REST API (`https://quicksend.lk/api/v1/`)

---

## 3. System Architecture & Data Flow

```
+-----------------------------------------------------------------------------------+
|                                  USER BROWSER                                     |
|  [ Modern Executive Charcoal Dark Theme ] / [ Crisp High-Contrast Light Theme ]   |
|  Desktop / Tablet / 60fps Jitter-Free Mobile View (<768px Optimized Layout)       |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                        REACT 19 APPLICATION (VITE 6)                              |
|                                                                                   |
|  +--------------------+   +-----------------------+   +------------------------+  |
|  | AuthContext.jsx    |   | StoreContext.jsx      |   | Theme & Design Tokens  |  |
|  | (RBAC, Multi-User) |   | (Reactive Dual-Sync)  |   | (src/index.css)        |  |
|  +--------------------+   +-----------------------+   +------------------------+  |
|            |                          |                           |               |
|            +--------------------------+---------------------------+               |
|                                       |                                           |
|  +------------------------------------+----------------------------------------+  |
|  |                               PAGES / MODULES                               |  |
|  |  * CRM Leads Pipeline          * Customers & Gym Profiles                   |  |
|  |  * Invoices & Billing          * Payments & Debtors Aging                   |  |
|  |  * Biometric Cloud Push        * LKAS 1 & LKAS 7 General Ledger             |  |
|  |  * Fixed Assets (LKAS 16)      * Inventory & Procurement                    |  |
|  |  * HR & EPF/ETF Payroll        * QuickSend SMS Gateway                      |  |
|  +------------------------------------+----------------------------------------+  |
+-----------------------------------------------------------------------------------+
           |                                    |                          |
           v                                    v                          v
+---------------------+              +--------------------+     +-------------------+
|  Supabase Postgres  |              | Vercel Serverless  |     | Client PDF Engine |
|  - customers        |              | API Proxies        |     | (jsPDF & AutoTable|
|  - invoices         |              +--------------------+     | for Invoices &    |
|  - journal_lines    |                 |              |        | Statements)       |
|  - employees        |                 v              v        +-------------------+
|  - inventory        |         +---------------+ +-------------+
+---------------------+         | eTechno Push  | | QuickSend   |
                                | Gateway       | | SMS API     |
                                | (83.147.38.130| | (Broadcasts)|
                                +---------------+ +-------------+
```

---

## 4. Comprehensive Module Directory

### 4.1 Executive Dashboard (`/`)
- **Key Metrics (KPIs)**: Monthly Recurring Revenue (MRR), Annual Recurring Revenue (ARR), Total Active Gym Clients, Total Monthly Active Gym Members, and Cloud Gateway Connectivity Status.
- **Visual Analytics**: Interactive Recharts graphs showing 12-month revenue growth, sales pipeline velocity, and active turnstile attendance distributions.
- **Action Hub**: Quick triggers to create invoices, add gym leads, run monthwise active member audits, or dispatch remote biometric commands.

### 4.2 CRM & B2B Sales Pipeline (`/leads`)
- **Dual Visual Modes**: Switch dynamically between Kanban drag-and-drop board and dense tabular view.
- **Pipeline Stages**: `New Lead` -> `Contacted` -> `Demo Scheduled` -> `Proposal Sent` -> `Negotiation` -> `Won (Converted)` -> `Lost`.
- **Conversion Workflow**: One-click convert from won lead to client record (`/customers`), automatically migrating gym facility details, contact details, and expected billing rates.

### 4.3 Gym Client & Facility Management (`/customers`)
- **Profile Configuration**: Gym facility name, client code, manager contact, telephone/WhatsApp, email, and billing address.
- **Hardware Profile Linkage**: Push Account # (`push_acc`), API Key / Auth Token, and configured multi-turnstile fleet (supporting 1 device or 2 devices with IN/OUT roles).
- **Contract Tracking**: Annual renewal dates, billing cycles, rate per active member per month, and total registered turnstile devices.

### 4.4 Client Portal & Document Sharing (`/portal`, `/pay`, `/share`)
- **Secured Unguessable Token Links**: In addition to authenticated phone OTP verification, public portals and payment routes support unguessable, cryptographically signed UUID tokens (`/portal/:shareToken`, `/pay/token/:shareToken`, `/share/token/:shareToken`).
- **IDOR & Enumeration Protection**: Guessable sequence or phone-based URL enumeration is prevented by validating unique `share_token` identifiers stored in Supabase with optional time-based expiration.
- **Customer Self-Service**: Customers can view outstanding balance, itemized service lines, payment history, and download high-resolution PDF receipts and invoices.

### 4.5 Quotations Engine (`/quotations`)
- **Quote Drafting**: Multi-item line builder with unit prices, quantity multipliers, item descriptions, and LKAS-compliant tax/discount breakdowns.
- **Status Lifecycle**: `Draft` -> `Sent` -> `Accepted` -> `Declined` -> `Invoiced`.
- **Automatic Invoice Conversion**: Instantly converts accepted quotes into formal accounts receivable invoices with matching line items and terms.

### 4.6 Invoicing & Recurring Billing (`/invoices`)
- **Lifecycle Engine**: Supports `Draft`, `Unpaid`, `Partially Paid`, `Paid`, `Overdue`, and `Cancelled`.
- **Biometric Push Billing Item**: Automatically generated billing lines for active member monthly fees (e.g. `12 Months x Avg 560 Active Members @ LKR 100/mo = LKR 672,000`).
- **PDF Generation**: Generates company-branded PDF invoices with payment bank details, QR codes, authorized signatory stamps, and itemized hardware fees.

### 4.7 Payments & Multi-Channel Settlement (`/payments`)
- **Payment Methods**: Cash, Bank Transfer, Cheque, Online Gateway (PayHere / Stripe).
- **Invoice Balance Allocation**: Automatically applies payments against unpaid invoice balances, updates debtor balances, and generates real-time payment receipts.
- **Double-Entry Ledger Sync**: Automatically creates general ledger journal entries debiting Cash/Bank (`1010`/`1020`) and crediting Accounts Receivable (`1030`).

### 4.8 Debtors Aging & Recovery (`/debtors`)
- **Aging Analysis**: Automatic categorization into 4 aging buckets:
  - Current (0 - 30 days)
  - 31 - 60 days
  - 61 - 90 days
  - 90+ days (Default / High Risk)
- **Recovery Actions**: One-click SMS payment reminders with customized payment links and statement balances.

### 4.9 Operational Expenses (`/expenses`)
- **Expense Classification**: Operating Expenses, Administrative Expenses, Finance Costs, Utilities, Software Hosting, Hardware Maintenance.
- **Audit Compliance**: Receipt attachment URLs, payee recording, payment account selection, and automatic ledger journal creation.

### 4.10 Fixed Assets Register (LKAS 16) (`/assets`)
- **Asset Registry**: Asset category, acquisition date, historical cost, estimated useful life, and salvage value.
- **Depreciation Calculation**: Supports Straight-Line Method and Reducing Balance Method per LKAS 16 standards.
- **Net Book Value (NBV)**: Real-time tracking of accumulated depreciation and carrying amount.

### 4.11 Procurement & Vendor Accounts (`/procurement`)
- **Purchase Orders (PO)**: Supplier management, item procurement (biometric devices, RFID cards, turnstile accessories).
- **Accounts Payable**: Bill tracking, vendor payment scheduling, and Goods Received Note (GRN) matching.

### 4.12 Product & Hardware Inventory (`/inventory`)
- **Stock Management**: Hardware stock counts (Biometric Readers, Flap Barriers, Turnstiles, Power Supplies).
- **Valuation**: Real-time stock valuation using FIFO and Weighted Average cost models.
- **Threshold Alerts**: Automated visual warnings when turnstile device inventory drops below minimum operating buffers.

### 4.13 Human Resources & Payroll Suite (`/hr`)
- **Employee Roster**: Staff records, job designations, basic salaries, allowances, and attendance tracking.
- **Sri Lanka Statutory Deductions**:
  - **EPF Employee (8%)**: Deducted from employee gross earnings.
  - **EPF Employer (12%)**: Employer statutory contribution.
  - **ETF Employer (3%)**: Employer trust fund contribution.
- **Payslip Engine**: Computes Net Salary and generates official printable PDF payslips compliant with the Department of Labour Sri Lanka.

### 4.14 SLFRS / LKAS Double-Entry General Ledger (`/ledger`)
- **Chart of Accounts**: 5-digit standard account codes covering Assets (1000s), Liabilities (2000s), Equity (3000s), Revenue (4000s), Cost of Sales (5000s), and Expenses (6000s).
- **Trial Balance Verification**: Dedicated 5th tab on `/ledger` providing a live, real-time aggregate verification of total opening, period movement, and closing balances across all accounts, guaranteeing that $\sum \text{Debits} = \sum \text{Credits}$ before closing financial periods.
- **Accounting Period Locking**: Safeguard preventing accidental backdated entries or retroactive journal modifications to financial periods marked as closed.
- **Bank Reconciliation Engine**: Dedicated matching module for `1020 Commercial Bank Account`, comparing ledger cash receipts and disbursements against uploaded bank statement transactions.
- **Statutory Financial Statements**:
  1. **LKAS 1 Statement of Profit or Loss**: Revenue, Cost of Sales, Gross Profit, Operating Expenses, Operating Profit, Finance Costs, Profit Before Tax, Income Tax, Net Profit.
  2. **LKAS 1 Statement of Financial Position (Balance Sheet)**: Current vs Non-Current assets/liabilities segregation, automated Retained Earnings roll-forward, and zero-discrepancy balance verification ($\text{Assets} = \text{Equity} + \text{Liabilities}$).
  3. **LKAS 7 Statement of Cash Flows (Indirect Method)**: Operating, Investing, and Financing cash flow reconciliation with cash/bank balances.

### 4.15 Biometric Cloud Push Portal & Turnstile Fleet (`/cloud-push`)
- Pinned static hardware fleet and authentication bar across all tabs.
- Full multi-turnstile fleet management (1 device or 2 devices per gym: Entrance `[IN]`, Exit `[OUT]`).
- Dedicated Gym Hardware Profiles modal (`+ New Gym Profile`, `Manage All Gym Profiles`).
- Monthwise active member auditing, annual billing statement generator, real-time punch streaming, and remote command center.

### 4.16 QuickSend SMS Communications Gateway (`/sms`)
- **Campaign Broadcasts**: Send bulk promotional campaigns or operational announcements.
- **Automated Templates**: Template engine with dynamic placeholders: `{name}`, `{gym}`, `{amount}`, `{dueDate}`, `{invoiceNumber}`, `{link}`.
- **Balance Telemetry**: Live credit balance query and message delivery status reporting.

### 4.17 Operations Tasks & Activity Management (`/tasks`)
- Team task tracking, client follow-up assignments, hardware installation tasks, priority flags, and completion timestamps.

### 4.18 Audit Logs & Security Trails (`/logs`)
- Real-time logging of user logins, hardware profile edits, invoice cancellations, journal entries, and system parameter changes.

### 4.19 System Administration & Branding (`/settings`)
- Organization branding (Company Name, Address, Contact, Currency `LKR`, Logo upload).
- User management and Role-Based Access Control (Admin, Accountant, Sales Manager, Support).
- Database backup and recovery tools.

---

## 5. Biometric Hardware Fleet & Cloud Push Deep Dive

### 5.1 Architecture & Gateway Integration
The application connects to the eTechno Biometric Cloud Push Gateway using a serverless reverse-proxy (`/api/etechno.js`) to bypass browser CORS limitations and protect hardware credentials.

```
+-------------------+        +--------------------+        +-------------------------+
| Browser Client    |  --->  | /api/etechno Proxy |  --->  | eTechno Hardware Server |
| (CloudPushPortal) |        | (Vercel Node.js)   |        | (http://83.147.38.130)  |
+-------------------+        +--------------------+        +-------------------------+
```

### 5.2 Multi-Turnstile Fleet Support (1 Device vs 2 Devices)
Gym facilities utilize different turnstile hardware configurations:
- **Single Turnstile Gyms (1 Device)**: 1 device serving two-way biometric verification (`IN/OUT`).
- **Dual Turnstile Gyms (2 Devices)**: Dedicated hardware pairing with 1 Entrance device (`[IN]`) and 1 Exit device (`[OUT]`).

### 5.3 Hardware Profiles Management
In `CloudPushPortal.jsx`:
- **Active Gym Profile Selection**: Selects a configured gym client, instantly auto-populating Push Account #, API Token, and all attached turnstile serial numbers.
- **Create Profile Modal (`+ New Gym Profile`)**:
  - Gym / Facility Details (Name, Code, Contact, Phone).
  - Push Credentials (Push Account #, API Key, Proxy URL).
  - Turnstile Device Roster (Serial #, Role `IN`/`OUT`/`IN/OUT`, Label).
  - Quick Turnstile Presets: **1 Device (Single)** or **2 Devices (Entrance IN + Exit OUT)**.
- **Manage Profiles Modal (`Manage All Gym Profiles`)**: View, search, inspect devices, edit, or delete gym hardware profiles with instant activation.

### 5.4 Monthwise Active Member Auditing Workflow
1. User selects gym client profile or inputs Account # and Serial #.
2. Selects billing date range (e.g. `2026-01-01` to `2026-12-31`).
3. Sets billing rate per active member per month (e.g. `LKR 100`).
4. System queries `/v2/transaction_month_total/` across all 12 months.
5. Deduplicates active user counts, calculates monthly billable totals, computes average monthly active users, and determines total annual license fee.
6. Generates official printable audit statement (`.statement-printable-sheet`) with one-click conversion to an accounts receivable invoice.

### 5.5 Real-Time Punch Stream (`/v2/transaction_real/`)
- Live telemetry stream capturing member punch logs with:
  - Member PIN & Name.
  - Timestamp.
  - Punch State (`Check-In` / `Check-Out`).
  - Verification Method (`Fingerprint`, `Face ID`, `RFID Card`).
  - Terminal Serial Number.
- 15-second auto-refresh mode with client-side search filtering.

### 5.6 Hardware Remote Command Center (`/v2/terminal_cmd_client/`)
- Dispatches hardware commands directly to turnstile devices:
  - `ReSync_Active`: Synchronizes member database.
  - `Clear_Att_Data`: Clears memory punch records after successful audit export.
  - `Reboot`: Remotely restarts turnstile firmware.
  - `Check_Status`: Pings device availability and connection latency.

---

## 6. SLFRS / LKAS Sri Lanka Accounting Engine Deep Dive

### 6.1 Accounting Compliance Principles
Financial statements are generated strictly from double-entry journal entries grouped by account `statement_category`:
- **LKAS 1 Presentation of Financial Statements**: Mandates structured disclosure of comparative periods, current vs non-current categorization, and separate disclosure of finance costs and depreciation.
- **LKAS 7 Statement of Cash Flows**: Uses the Indirect Method starting from Profit Before Tax, adjusting for non-cash expenses, working capital changes, and investing/financing cash flows.
- **LKAS 16 Property, Plant and Equipment**: Depreciation is computed monthly and charged against Administrative Expenses.

### 6.2 Standard Chart of Accounts Matrix

| Account Code | Account Name | Category | Classification | Normal Balance |
|---|---|---|---|---|
| **1010** | Cash in Hand | Current Assets | Cash & Cash Equivalents | Debit |
| **1020** | Commercial Bank Account | Current Assets | Cash & Cash Equivalents | Debit |
| **1030** | Accounts Receivable (Debtors) | Current Assets | Trade & Other Receivables | Debit |
| **1040** | Hardware Inventory | Current Assets | Inventories | Debit |
| **1510** | Office Equipment & Turnstiles | Non-Current Assets | Property, Plant & Equipment | Debit |
| **1520** | Accumulated Depreciation | Non-Current Assets | Contra-Asset | Credit |
| **2010** | Accounts Payable (Creditors) | Current Liabilities | Trade & Other Payables | Credit |
| **2020** | Customer Advances & Deposits | Current Liabilities | Contract Liabilities | Credit |
| **2025** | APIT / EPF / ETF Payable | Current Liabilities | Statutory Payables | Credit |
| **2035** | Output VAT Payable (18%) | Current Liabilities | Statutory Tax Liabilities | Credit |
| **2040** | SSCL Payable (2.5%) | Current Liabilities | Statutory Tax Liabilities | Credit |
| **3010** | Stated Capital | Equity | Equity Capital | Credit |
| **3020** | Retained Earnings | Equity | Retained Earnings | Credit |
| **4010** | Cloud Push Software License Revenue | Revenue | Operating Revenue | Credit |
| **4020** | Turnstile Hardware Sales Revenue | Revenue | Operating Revenue | Credit |
| **5010** | Hardware Cost of Goods Sold | Cost of Sales | Direct Costs | Debit |
| **6010** | Salaries & Staff Wages | Expenses | Administrative Expenses | Debit |
| **6020** | EPF Employer Contribution (12%) | Expenses | Administrative Expenses | Debit |
| **6030** | ETF Employer Contribution (3%) | Expenses | Administrative Expenses | Debit |
| **6040** | Server Hosting & SMS Costs | Expenses | Operating Expenses | Debit |
| **6050** | Depreciation Expense (LKAS 16) | Expenses | Administrative Expenses | Debit |

### 6.3 Accounting Period Locking & Reversal Vouchers
- **Period Cut-off (`closed_before_date`)**: Configurable in **Settings > Bank & Payments**. Any journal entries, invoices, or payment transactions dated on or before this cut-off cannot be modified or hard-deleted.
- **LKAS 1 Audit Traceability**: Corrections to closed periods require generating double-entry **Reversal Vouchers** (`createReversalJournalEntry`) or issuing formalized Credit Notes, maintaining an unbroken financial audit trail.

### 6.4 Trial Balance & Orphaned Line Audit
- **Orphan Line Detection**: The `calculateTrialBalance` engine inspects every journal line against the active Chart of Accounts. Any line with an unresolved `accountId` is surfaced as an orphaned voucher alert banner in `/ledger`, preventing hidden accounting discrepancies.

---

## 7. Design System & UI/UX Tokens

### 7.1 Modern Executive Dark Mode (No Neon Cyan)
The dark mode features an eye-friendly, high-contrast, professional slate and charcoal palette:
- **Canvas (`--bg-color`)**: `#0b0d13` (Zero blue/cyan tint)
- **Primary Surface (`--bg-primary`)**: `#12161f`
- **Card / Widget Surfaces (`--bg-secondary`)**: `#1a202c`
- **Elevated Sub-Panels (`--bg-tertiary`)**: `#232a3b`
- **Card Borders (`--panel-border`)**: `rgba(255, 255, 255, 0.12)` (Crisp, solid 1px boundaries)
- **Input Fields (`--input-bg`)**: `#10141d` (Recessed darker surface with `#333c4d` border and inset shadow)
- **Primary Brand Accent (`--accent-primary`)**: `#6366f1` (Balanced Indigo)

### 7.2 High-Contrast Pure White Light Mode
- **Canvas (`--bg-color`)**: `#f1f5f9` (Cool soft slate)
- **Card Surfaces (`--bg-secondary`)**: `#ffffff` (Solid pure white)
- **Card Borders (`--panel-border`)**: `#e2e8f0` (Clean, defined 1px slate border)
- **Input Fields (`--input-bg`)**: `#ffffff` with `#cbd5e1` border and `#0f172a` text

### 7.3 Identified Widgets, Buttons & Form Elements
- **Widgets & Panels**: Clear visual background contrast, solid borders, and clean elevation shadows in both modes.
- **Buttons (`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-success`, `.btn-danger`)**: Unmistakable borders, solid fills, hover states, and tactile active press (`transform: scale(0.98)`).
- **Form Controls (`.form-control`, `.form-input`, `select`, `textarea`, `DatePicker`)**: High-contrast borders that never blend into card backgrounds, with a 3px focus ring (`rgba(99, 102, 241, 0.22)`).

### 7.4 60fps Mobile Performance Optimization
- **Zero Scroll Lag**: Removed `background-attachment: fixed` on `body` (which caused full-screen software repaints on mobile GPUs).
- **Disabled Heavy Blurs on Mobile**: Under `@media (max-width: 768px)`, `backdrop-filter: blur(...)` is disabled, allowing native GPU layer scrolling.
- **Mobile Adaptations**: Single-column responsive form stacking, touch-friendly button targets ($\ge 42\text{px}$), smooth horizontal touch-scrolling for portal tabs, and responsive modal bottom sheets.

### 7.5 Responsive Breakpoint & Mobile Layout Rules
The frontend architecture enforces strict mobile-first viewport rules:
- **`375px` (Compact Mobile Phones)**:
  - Global `box-sizing: border-box`, `overflow-x: clip`, and `min-width: 0` prevent horizontal window shift.
  - Modals render as mobile bottom sheets (`border-radius: 20px 20px 0 0; max-height: 92dvh; width: 100%`) with touch scroll.
  - Form inputs (`<input>`, `<select>`, `<textarea>`) enforce `font-size: 16px` to prevent iOS Safari auto-zooming, with `min-height: 44px` touch targets.
  - Search input wrappers expand to full width (`width: 100%`).
- **`640px` (Phablet / Standard Mobile)**:
  - Header actions collapse secondary labels, preserving high-priority icon triggers.
  - Sub-navigation bars (`/hr`, `/cloud-push`, `/ledger`) render as single-row horizontally scrollable pill bars (`.horizontal-pill-bar`) with native kinetic scrolling (`-webkit-overflow-scrolling: touch`).
- **`768px` (Tablet Portrait)**:
  - Data tables switch from horizontal squishing to `.table-responsive` cards or touch-scrollable panes.
  - The Kanban pipeline (`/leads`) engages horizontal snap scrolling (`scroll-snap-type: x mandatory; min-width: 280px`).
  - Desktop sidebar converts to an off-canvas slide-over drawer with semi-transparent backdrop and auto-close on navigation.
- **`1024px+` (Desktop & Large Displays)**:
  - Full multi-column analytical studios, persistent or collapsible sidebar, and full financial grid layouts.

---

## 8. Data Models & Schema Reference

### 8.1 Customer / Gym Facility Entity (`customers`)
```json
{
  "id": "cust-172",
  "name": "PowerFit Colombo",
  "gymName": "PowerFit Gym & Fitness Centre",
  "code": "CUST-172",
  "phone": "0771234567",
  "email": "info@powerfit.lk",
  "address": "No. 45, Galle Road, Colombo 03",
  "cloudPushAcc": "192",
  "cloudPushApiKey": "cGYm94tX97qA6cXw7UKgh64nr",
  "deviceSerial": "NYU7254000011",
  "deviceSerials": [
    {
      "id": "dev-1",
      "sn": "NYU7254000011",
      "role": "IN",
      "label": "Entrance Turnstile (IN)"
    },
    {
      "id": "dev-2",
      "sn": "NYU7254000012",
      "role": "OUT",
      "label": "Exit Turnstile (OUT)"
    }
  ],
  "ratePerUserMonth": 100,
  "purchaseDate": "2026-01-01",
  "renewalDate": "2026-12-31"
}
```

### 8.2 Invoice Entity (`invoices`)
```json
{
  "id": "inv-1714001",
  "invoiceNumber": "INV-2026-8921",
  "date": "2026-01-05T00:00:00.000Z",
  "dueDate": "2026-02-05T00:00:00.000Z",
  "customerId": "cust-172",
  "prospectName": "PowerFit Gym & Fitness Centre",
  "amount": 672000,
  "paidAmount": 672000,
  "balance": 0,
  "status": "Paid",
  "items": [
    {
      "id": "item-1",
      "name": "Biometric Cloud Push Service Annual License (2 Devices: NYU7254000011 [IN], NYU7254000012 [OUT])",
      "desc": "Active member cloud push sync across 2 turnstiles under Acc #192. Avg 560 active users/mo @ LKR 100/mo.",
      "type": "Cloud Service",
      "price": 672000,
      "quantity": 1,
      "billingCycle": "Annual"
    }
  ]
}
```

### 8.3 Supabase SQL Schema & Row-Level Security (RLS) Policy Matrix
Every PostgreSQL table is guarded by RLS policies synchronized with Supabase JWT claims:

| Table | Policy Name | Permitted Roles | Conditions & Invariants |
|---|---|---|---|
| `customers` | `tenant_customer_isolation` | `admin`, `sales`, `accountant` | Read/write allowed for workspace members; public read allowed by `share_token` |
| `invoices` | `financial_invoice_access` | `admin`, `accountant` | `auth.uid() IS NOT NULL`; payments and status updates verified against posted ledger entries |
| `journal_lines` | `double_entry_balance_check` | `admin`, `accountant` | `sum(debits) = sum(credits)` verified before commit; posted periods locked against deletion |
| `employees` | `hr_payroll_access` | `admin`, `hr` | Read/write restricted to HR and executive roles; employees view their own payslips |
| `inventory` | `inventory_control` | `admin`, `sales`, `engineer` | Stock decrements logged with linked customer or invoice reference |
| `audit_logs` | `immutable_audit_trail` | All roles (`INSERT` only) | Append-only system log; `UPDATE` and `DELETE` disallowed |

---

## 9. API Integrations & Serverless Proxies

### 9.1 eTechno Cloud Push Gateway (`/api/etechno.js`)
- **Upstream Host**: `http://83.147.38.130:666`
- **Method**: Reverse-proxy supporting `GET`, `POST`, `PUT`, `DELETE`.
- **Endpoints**:
  - `GET /v2/transaction_month_total/?push_acc={acc}&dev_sn={sn}&from_date={d1}&to_date={d2}`: Retrieves monthly active user count.
  - `GET /v2/transaction_real/?push_acc={acc}&last_minute={m}`: Fetches real-time biometric punch stream.
  - `POST /v2/terminal_cmd_client/`: Dispatches remote commands (`ReSync_Active`, `Clear_Att_Data`, `Reboot`).
  - `GET /v2/terminal/?push_acc={acc}`: Lists all registered terminals under an account.
  - `PUT /v2/terminal/`: Registers a new device serial number to a push account.
  - `GET /v2/terminal_status/?push_acc={acc}&dev_sn={sn}`: Pings terminal connection status.

### 9.2 QuickSend SMS Gateway (`/api/quicksend.js`)
- **Upstream Host**: `https://quicksend.lk/api/v1/`
- **Method**: POST
- **Payload**:
  ```json
  {
    "to": "94771234567",
    "message": "Dear Kasun, your gym software renewal for PowerFit Gym (INV-2026-8921) of Rs. 672,000 is due on 2026-02-05. Pay online: https://seynex.lk/pay/0771234567",
    "sender_id": "SEYNEX"
  }
  ```

### 9.3 Serverless Proxy JWT Auth & Error Sanitization
Both `/api/etechno.js` and `/api/quicksend.js` implement secure reverse proxy standards:
1. **JWT Authentication Gate**: Production requests must supply a valid Supabase Auth Bearer token (`Authorization: Bearer <token>`). Unauthenticated or anonymous calls are rejected with HTTP 401 Unauthorized.
2. **Credential Concealment**: Upstream credentials (`cloudPushApiKey`, QuickSend Basic Auth / API Keys) remain securely on the serverless backend and are never sent over the wire to unauthenticated clients.
3. **Structured Error Sanitization**: Upstream network or authentication failures are captured and returned as standardized JSON payloads (`{ ok: false, code: 'AUTH_ERROR', message: 'SMS gateway credentials unverified.' }`), eliminating raw stack traces and Basic Auth error exposures.

---

## 10. Installation, Local Development & Deployment

### 10.1 Prerequisites
- **Node.js**: `v18.0.0` or higher (Node.js 20+ LTS recommended)
- **Package Manager**: `npm` (v9+) or `pnpm`

### 10.2 Installation Steps
```bash
# 1. Clone repository
git clone https://github.com/your-org/sales-manager.git
cd sales-manager

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
```

### 10.3 Environment Variables (`.env`)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
QUICKSEND_API_KEY=your-quicksend-api-token
ETECHNO_GATEWAY_URL=http://83.147.38.130:666
```

### 10.4 Development & Build Commands
```bash
# Run local Vite development server (hot-reload on http://localhost:5173)
npm run dev

# Run production build and bundling validation
npm run build

# Preview production build locally
npm run preview

# Run ESLint validation
npm run lint
```

### 10.5 Production Deployment (Vercel)
The project includes a pre-configured `vercel.json` file configuring single-page application rewrites and serverless function routes:
```json
{
  "rewrites": [
    { "source": "/api/etechno/:path*", "destination": "/api/etechno" },
    { "source": "/api/quicksend/:path*", "destination": "/api/quicksend" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

---

## 11. Role-Based Access Control (RBAC) & Security

The system employs granular permission keys checked via `ProtectedRoute` in `App.jsx`:

| Role | Permissions | Accessible Modules |
|---|---|---|
| **Super Admin** | Full access (`*`) | All 19 modules, system settings, user roles, audit logs |
| **Sales Manager** | `manage_leads`, `manage_clients`, `manage_quotes`, `manage_tasks` | Dashboard, Leads, Customers, Quotations, Tasks |
| **Accountant** | `view_financials`, `manage_invoices`, `view_debtors`, `manage_expenses`, `view_reports` | Dashboard, Invoices, Payments, Debtors, Expenses, Assets, General Ledger, Reports |
| **Hardware Engineer** | `manage_clients`, `view_reports` | Dashboard, Customers, Cloud Push Portal, Terminal Fleet |
| **HR Specialist** | `manage_users`, `manage_tasks` | HR & Payroll Suite, Staff Attendance, Payslips |

---

## 12. Summary Checklist for Operators
- **Adding a New Gym**: Navigate to `Cloud Push Portal` -> click `+ New Gym Profile` -> select single or dual turnstile preset -> input Account # and Turnstile Serial Numbers -> click `Create & Activate Gym Profile`.
- **Running an Active Member Audit**: Navigate to `Cloud Push Portal` -> select Gym Client -> set Date Range (e.g. Annual 2026) -> click `Fetch Active User Statement` -> review monthwise breakdown -> click `Create Annual Invoice` to automatically generate the bill.
- **Closing Financial Month**: Ensure all invoices and expenses are posted -> navigate to `/ledger` -> check `Profit or Loss` and `Balance Sheet` -> verify that the Balance Sheet banner confirms $\text{TOTAL ASSETS} = \text{TOTAL EQUITY AND LIABILITIES}$.

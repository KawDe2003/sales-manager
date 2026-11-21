# GymSales Pro Enterprise (Seynex Suite)
> **B2B Sales CRM, Biometric Hardware Push Telemetry & SLFRS/LKAS Financial Suite**  
> *Engineered for Gym Software Vendors, Fitness Franchises, and Turnstile Fleet Operators.*

[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-Proprietary-indigo)](#)

---

## 📖 Complete Master Documentation
For the complete technical architecture, deep-dive module manual, API specifications, and accounting compliance guidelines, see:
👉 **[APPLICATION_DOCUMENTATION.md](file:///c:/Users/USER/sales%20mgr/sales-manager/APPLICATION_DOCUMENTATION.md)**

---

## ⚡ Key Highlights & Core Capabilities

### 1. 🏢 B2B CRM & Client Lifecycle Management
- **Leads Pipeline (`/leads`)**: Drag-and-drop Kanban & tabular view with lead qualification, win/loss conversion, and activity logs.
- **Gym Client Management (`/customers`)**: Multi-facility profiles with attached hardware turnstiles, subscription terms, and automated renewals.
- **Client Self-Service & Share Portal (`/portal`, `/pay`, `/share`)**: Direct token-free web links for clients to inspect invoices, statements, and download PDF receipts.

### 2. 📟 Biometric Cloud Push Telemetry & Turnstile Fleet
- **Multi-Turnstile Fleet Support**: Handles both single turnstile (1 device) and dual turnstile (2 devices: Entrance `[IN]` + Exit `[OUT]`) setups.
- **Gym Hardware Profiles**: Centralized manager (`+ New Gym Profile`, `Manage All Gym Profiles`) storing Push Account #, API Token, and turnstile device serial numbers.
- **Monthwise Active Member Auditing**: Direct integration with eTechno Push Gateway (`/v2/transaction_month_total/`) to audit unique monthly active users across 12-month billing periods with automated invoice calculation.
- **Real-Time Punch Stream**: Live telemetry monitoring (`/v2/transaction_real/`) with search, filter, and 15s auto-refresh.
- **Hardware Command Center**: Dispatches over-the-air commands (`ReSync_Active`, `Clear_Att_Data`, device reboots).

### 3. 📊 SLFRS / LKAS Double-Entry General Ledger
- **LKAS 1 Statement of Profit or Loss**: Revenue, Cost of Sales, Gross Profit, Operating Expenses, Operating Profit, and Profit Before Tax with side-by-side comparative periods.
- **LKAS 1 Statement of Financial Position (Balance Sheet)**: Current vs Non-Current classification, automated Retained Earnings roll-forward, and zero-discrepancy balance verification ($\text{Assets} = \text{Equity} + \text{Liabilities}$).
- **LKAS 7 Statement of Cash Flows (Indirect Method)**: Operating, investing, and financing cash reconciliations with cash and bank ledger balances.
- **Fixed Assets Register (LKAS 16)**: Straight-line and reducing balance depreciation schedules.

### 4. 👥 Operations, Payroll & HR Suite
- **HR & Payroll (`/hr`)**: Staff attendance, basic salary, allowances, and Sri Lanka statutory deductions (**EPF 8% / 12%**, **ETF 3%**) with printable PDF payslips.
- **Inventory & Procurement (`/inventory`, `/procurement`)**: Stock valuations (FIFO/Weighted Average), low-stock alerts, purchase orders, and supplier accounts payable.

### 5. 📱 SMS Communications Gateway
- **QuickSend Gateway (`/sms`)**: Integrated SMS broadcasting for renewal reminders, debt nudges, and payment receipts with dynamic tags (`{name}`, `{gym}`, `{amount}`, `{dueDate}`, `{link}`).

### 6. 🎨 Executive UI/UX Design System
- **Modern Charcoal & Slate Dark Theme**: Deep `#0b0d13` canvas, `#181e2b` card surfaces, `#6366f1` indigo accents, and zero neon cyan glare.
- **High-Contrast Pure White Light Theme**: Crisp pure white `#ffffff` cards on cool soft slate `#f1f5f9` canvas.
- **Identifiable Elements**: High-contrast borders, recessed form inputs (`.form-control`, `.form-input`), and tactile buttons.
- **60fps Jitter-Free Mobile**: Eliminated fixed background overhead and heavy backdrop blurs on mobile devices ($\le 768\text{px}$) for smooth scrolling.

---

## 🛠️ Quick Start & Local Development

### Prerequisites
- Node.js `v18.0.0` or higher (Node 20+ LTS recommended)
- `npm` or `pnpm`

### Installation
```bash
# Clone the repository
git clone https://github.com/your-org/sales-manager.git
cd sales-manager

# Install project dependencies
npm install

# Configure environment variables
cp .env.example .env

# Start local development server (http://localhost:5173)
npm run dev

# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 📂 Project Directory Structure

```
sales-manager/
├── api/                       # Vercel serverless reverse proxies
│   ├── etechno.js             # eTechno Biometric Push gateway proxy
│   ├── health.js              # System health & telemetry endpoint
│   └── quicksend.js           # QuickSend SMS gateway proxy
├── public/                    # Static brand assets, favicon, icons
├── src/
│   ├── components/            # Reusable UI components (CustomSelect, DatePicker, etc.)
│   ├── context/               # Global state contexts (StoreContext, AuthContext)
│   ├── pages/                 # Application modules and views
│   │   ├── CloudPushPortal.jsx# Biometric telemetry & turnstile fleet
│   │   ├── Customers.jsx      # Gym facility profiles & contracts
│   │   ├── Dashboard.jsx      # Executive KPI & MRR/ARR analytics
│   │   ├── Debtors.jsx        # Debt aging & recovery analysis
│   │   ├── HR.jsx             # HR & statutory EPF/ETF payroll
│   │   ├── Invoices.jsx       # Invoicing & recurring billing engine
│   │   ├── Leads.jsx          # CRM sales pipeline (Kanban / Table)
│   │   ├── Ledger.jsx         # SLFRS/LKAS double-entry general ledger
│   │   ├── Quotations.jsx     # Quote builder & invoice conversion
│   │   └── SmsPortal.jsx      # QuickSend SMS gateway broadcasts
│   ├── utils/                 # Business logic, cloudPushService, PDF & export engines
│   ├── App.jsx                # Application routing, layout & RBAC security
│   └── index.css              # Custom CSS design tokens & mobile responsive rules
├── APPLICATION_DOCUMENTATION.md# Master technical architecture & manual
├── package.json               # Dependencies and scripts
└── vite.config.js             # Vite build configuration
```

---

## 📄 License & Distribution
Proprietary & Confidential. All rights reserved by **Seynex Enterprises**.  
For enterprise licensing, contact `billing@seynex.lk`.

# Application Inventory & Component Audit

**Document:** `docs/inventory.md`  
**Audit Date:** 3 Oct 2026  
**Stack Detected:** React 19 SPA, Vite 6, Supabase PostgreSQL, Vercel Edge (sin1)

---

## 1. Primary Navigation & Route Structure

| Navigation Section | Route | Page Component | Feature Flag Key | Purpose / Function | Weight / Heavy Dependencies |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CORE** | `/` | `Dashboard.jsx` | *(Always on)* | Executive KPI cards, Cashflow Studio, Pipeline Funnel, Revenue Trends | **Heavy**: `recharts` (Area, Radial, Pie, Bar), full StoreContext subscription |
| **CORE** | `/tasks` | `Tasks.jsx` | `tasks` | Calendar grid, reminders, follow-up scheduling | **Medium**: Date/time calculations, task filtering |
| **CORE** | `/leads` | `Leads.jsx` | `leads` | Inbound pipeline, Kanban board (5 stages), calendar & list views | **Medium**: Client-side board drag & search |
| **CORE** | `/customers` | `Customers.jsx` | *(Always on)* | Client/Gym directory, annual memberships, renewal dates | **Low-Medium**: Table search and tag filtering |
| **SALES & OPS** | `/quotations` | `Quotations.jsx` | `quotations` | Commercial proposals, revision history, conversion to invoice | **Heavy**: `jspdf` PDF preview & generation |
| **SALES & OPS** | `/invoices` | `Invoices.jsx` | *(Always on)* | Invoicing, payment allocation, installment plans, WhatsApp & SMS dispatch | **Heavy**: `jspdf`, `html2canvas`, payment calculators |
| **SALES & OPS** | `/inventory` | `Inventory.jsx` | `inventory` | Stock catalog, categories, wholesale/retail pricing, reorder thresholds | **Medium**: Multi-attribute stock filtering |
| **SALES & OPS** | `/procurement` | `Procurement.jsx` | `procurement` | Supplier directory, Purchase Orders (PO), stock receiving | **Heavy**: `jspdf`, supplier VAT calculations |
| **SALES & OPS** | `/manufacturing` | `Manufacturing.jsx` | `manufacturing` | Bill of Materials (BOM) formulations, Production Orders (MO) | **Medium**: Multi-level cost rollup calculations |
| **SALES & OPS** | `/hr` | `HR.jsx` | `hrPayroll` | Employee directory, monthly payrun engine, leave tracking | **Medium**: EPF/ETF statutory calculations |
| **FINANCE** | `/payments` | `Payments.jsx` | *(Always on)* | Customer payment recording, bank slip uploads, invoice matching | **Medium**: Allocation ledger matching |
| **FINANCE** | `/debtors` | `Debtors.jsx` | `debtors` | Aging breakdown (Current, 1-30d, 31-60d, 61-90d, 90d+), overdue nudges | **Low-Medium**: Real-time debtor calculation |
| **FINANCE** | `/expenses` | `Expenses.jsx` | `expenses` | Operating expenses, receipt attachments, category rollups | **Medium**: Month-to-date aggregate charting |
| **FINANCE** | `/assets` | `FixedAssets.jsx` | `fixedAssets` | Asset register, straight-line depreciation calculations | **Low-Medium**: Depreciation math |
| **FINANCE** | `/reports` | `Reports.jsx` | *(Always on)* | SLFRS Cash Flow statement, P&L, Balance Sheet, Sales analytics | **Heavy**: `recharts`, `xlsx` export, SLFRS engine |
| **FINANCE** | `/ledger` | `Ledger.jsx` | `ledger` | Double-entry general ledger, journal vouchers, trial balance | **Medium**: Double-entry balance validation |
| **SYSTEM** | `/sms` | `SmsPortal.jsx` | `smsPortal` | Gateway SMS broadcast, campaign templates, delivery logs | **Medium**: Direct SMS gateway API |
| **SYSTEM** | `/logs` | `Logs.jsx` | *(Admin/Audit)* | System activity audit logs | **Low**: Tabular log viewer |
| **SYSTEM** | `/settings` | `Settings.jsx` | *(Admin)* | Company profile, users, permissions, plan presets, backup/restore | **Medium-Heavy**: Multi-business switcher, image compressors |
| **SYSTEM** | `/features` | `Features.jsx` | *(Always on)* | Modular feature toggle directory | **Low**: Static card directory |
| **PUBLIC** | `/login` | `Login.jsx` | *(Public)* | Authentication screen, demo profile shortcuts | **Critical**: Must NOT load heavy dashboard dependencies |
| **PUBLIC** | `/share/:type/:id` | `SharedDocument.jsx` | *(Public)* | Public invoice/quote/PO view for client approval and payment | **Medium**: Lightweight document viewer |

---

## 2. Form Field Inventory & Redundancy Analysis

### 2.1 Lead Form (`/leads`)
- **Trigger**: `+ New Prospect` button.
- **Current Fields**:
  1. Client Business / Gym Name *(Required)*
  2. Key Decision Maker / Contact Person *(Required)*
  3. Pipeline Stage *(Dropdown: New, Contacted, Interested, Demo Scheduled, Refused)*
  4. Mobile Contact *(Required)*
  5. Email Address *(Optional)*
  6. Next Action Date *(Date picker)*
  7. Next Action Goal *(Text input)*
  8. Background / Discovery Notes *(Textarea)*
- **Audit Evaluation**:
  - *Keep in Minimal Quick-Add*: Client Name, Mobile Contact (+94 default), Estimated Deal Value, Source.
  - *Automate*: Owner (current user), Stage (default "New"), Creation Date, Phone normalisation.
  - *Move to Advanced Accordion*: Email Address, Discovery Notes, Next Action Goal.

### 2.2 Customer Form (`/customers`)
- **Trigger**: `Add Customer` / `Register Gym`.
- **Current Fields**:
  1. Gym / Client Entity Name *(Required)*
  2. Contact Person *(Required)*
  3. Phone Number *(Required)*
  4. Email Address
  5. Physical Address
  6. Lead Source *(Walk-in, Referral, Social Media, Exhibition, Website)*
  7. Membership / Purchase Date
  8. Renewal Frequency *(Monthly, Quarterly, Annual)*
  9. Tax / VAT ID
  10. Custom Notes
- **Audit Evaluation**: Clean, but address and tax ID can be collapsed under an "Organization Details" section.

### 2.3 Quotation Form (`/quotations`)
- **Trigger**: `Create Quotation` / `Draft Proposal`.
- **Current Fields**:
  1. Customer Dropdown / New Customer toggle
  2. Quote Reference Number *(Auto-sequenced)*
  3. Issue Date & Validity Expiry Date
  4. Dynamic Line Items array: Item Name/Product, Quantity, Unit Price, Tax/Discount, Line Total
  5. Terms & Payment Schedule notes
  6. Internal Sales Notes
- **Audit Evaluation**: Fast calculation, but line items should allow instant selection from inventory rather than manual typing.

### 2.4 Invoice Form (`/invoices`)
- **Trigger**: `Create Invoice` / `⚡ Quick Sale`.
- **Current Fields**:
  1. Customer Selector
  2. Sequential Invoice Number *(INV-xxxx)*
  3. Invoice Date & Due Date
  4. Payment Terms dropdown *(Net 7, Net 14, Net 30, Due Upon Receipt)*
  5. Product/Service Line Items array (Name, SKU, Qty, Price, Line Total)
  6. Installment Schedule generator (optional)
  7. Public notes & Legal Disclaimers
- **Audit Evaluation**: Quick Sale modal is well-optimized for 1-tap counter sales. The full invoice form has some redundant disclaimer fields that should inherit from corporate defaults.

---

## 3. Heavy & Redundant Charts and UI Elements

1. **Dashboard Revenue Pace vs Reports P&L**:
   - Dashboard renders 4 separate chart cards (`ModernGlassTooltip`, `AreaChart`, `RadialBarChart`, `PieChart`, `BarChart`).
   - Reports page renders identical chart projections.
   - **Recommendation**: Lazy-load all Recharts components using `React.lazy` so neither `/login` nor initial page boot waits for Recharts.
2. **Icons Bundle (`lucide-react`)**:
   - `App.jsx`, `Dashboard.jsx`, and pages import dozens of icons individually from `lucide-react`.
   - In production, bundler must tree-shake unused icons or split icon chunks.
3. **Export Libraries (`jspdf`, `xlsx`)**:
   - Currently imported at top-level in `src/utils/pdfGenerator.js` and `src/utils/export.js`.
   - **Recommendation**: Dynamic `import('jspdf')` and `import('xlsx')` only when user clicks "Export to Excel" or "Download PDF".

---

## 4. Cut-List Recommendations (For Phase 5 Owner Review)

| Screen / Feature | Current Location | Proposed Change | Rationale |
| :--- | :--- | :--- | :--- |
| **All-time Date Filter** | Dashboard / Invoices | Default to "This Month (30d)" | Prevents scanning unbounded records on boot |
| **Redundant Funnel Chart** | Dashboard | Condense to 4-stage horizontal bar | Donut and pie charts take excessive vertical space |
| **User Provisioning Form** | Settings Tab 1 | Keep in Settings under Users | Already correctly placed in Settings |
| **SMS Broadcast Gateway Config** | Settings Tab 5 | Keep in Settings | Correctly placed |
| **Activity Log Full Scan** | `/logs` | Paginate 25 rows per page | Currently loads all logs into DOM |
| **Leads Board Virtualization** | `/leads` | Paginate list view (25/page) | Virtualize when lead count exceeds 100 |

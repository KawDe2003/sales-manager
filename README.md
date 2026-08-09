# Sales Manager Pro (Enterprise Edition) - Design & Architecture Context

This document provides exhaustive detail about the architecture, target audience, and UI structure of **Sales Manager Pro**. 
**AI Assistant Prompt:** If you are an AI reading this document (like Claude or ChatGPT), your goal is to understand the complete application context so you can generate highly precise, cohesive, and beautiful **Color Palettes (CSS Variables)** for the UI.

---

## 1. Application Overview & Target Audience

- **Application Name**: Sales Manager Pro (Gym Management Edition)
- **Target Audience**: B2B Enterprise Users, Gym Owners, Sales Managers, and Financial Accountants.
- **Vibe/Aesthetic**: Modern, Trustworthy, Premium SaaS, Professional, Data-Heavy, Eye-Friendly. It needs to look expensive but extremely functional for users looking at screens for 8+ hours a day.
- **Core Layout**: A persistent left sidebar (collapsible), a top header area with breadcrumbs/titles, and a main content area containing responsive grid layouts of Metric Cards and Data Tables.

---

## 2. Core Modules & UI Components

The system has several critical modules that rely heavily on semantic color mapping (Success, Warning, Danger, Info).

### CRM & Sales Pipeline (`/customers`, `/leads`, `/quotations`, `/tasks`)
- **Visuals**: Uses status badges (e.g., Pending, Accepted, Rejected).
- **Components**: Kanban-style task boards, searchable data tables, multi-step modals.

### Financial Management (`/invoices`, `/payments`, `/expenses`, `/reports`)
- **Visuals**: Heavy use of positive/negative currency values, profit & loss charts, pie charts.
- **Components**: Large metric cards (e.g., "Total Revenue", "Net Profit"), intricate PDF generation buttons.

### Component Design Language
- **Panels/Cards**: We use slightly transparent, glassmorphic panels (`--panel-bg`) resting on top of a deeper background (`--bg-color`).
- **Inputs**: Form inputs rest inside panels and need a slight contrast (`--input-bg`).
- **Shadows**: Soft, deep shadows for dark mode, crisp elevated shadows for light mode.

---

## 3. The CSS Variable Theming System

The application is entirely styled using the CSS variables below. To generate a new color palette, you **MUST** provide exact hex codes and rgba values for every single variable in this exact format.

### Required CSS Variables Template

```css
:root {
  /* ===== [YOUR THEME NAME] Dark Mode Palette ===== */
  
  /* 1. Base Backgrounds */
  --bg-color: #...;       /* Deepest background (App Canvas) */
  --bg-primary: #...;     /* Base primary (often similar to bg-color) */
  --bg-secondary: #...;   /* Slightly lighter background */
  --bg-tertiary: #...;    /* Lightest background layer */

  /* 2. Panels and Cards (Glassmorphism / Contrast) */
  --panel-bg: rgba(...);          /* Background of data cards (must contrast with bg-color) */
  --panel-border: rgba(...);      /* Border of cards */
  --panel-border-highlight: rgba(...); /* Hover state border */
  --panel-glow: rgba(...);        /* Optional neon/soft glow behind panels */

  /* 3. Typography */
  --text-primary: #...;   /* Main readable text (High contrast) */
  --text-secondary: #...; /* Subtitles, labels (Medium contrast) */
  --text-muted: #...;     /* Disabled text, placeholders (Low contrast) */

  /* 4. Inputs & Shadows */
  --card-shadow: 0 12px 30px -5px rgba(...);
  --input-bg: rgba(...);          /* Inside of text boxes/selects */
  --input-border: rgba(...);      /* Border of inputs */
  --input-focus: #...;            /* Outline color when input is clicked */

  /* 5. Header & Subtle Areas */
  --subtle-bg: rgba(...);         /* Very faint background for table headers/stripes */
  --subtle-border: rgba(...);     /* Dividers inside panels */
  --header-bg: rgba(...);         /* Sticky header background */

  /* 6. Brand Accents */
  --accent-primary: #...;   /* Main brand color (Buttons, active links) */
  --accent-secondary: #...; /* Secondary compliment */
  --accent-pink: #...;      /* For specific charts/icons */
  --accent-cyan: #...;      
  --accent-emerald: #...;   
  --accent-amber: #...;
  --accent-rose: #...; 
  --accent-glow: rgba(...); /* Drop shadow for primary buttons */
  --accent-gradient: #...;  /* Can be a solid color or a linear-gradient */

  /* 7. Semantic Status Colors (Used heavily in CRM/Finance) */
  --success: #...;          /* Green / Positive */
  --success-bg: rgba(...);  /* Faint background for success badges */
  --warning: #...;          /* Yellow/Orange / Pending */
  --warning-bg: rgba(...);
  --danger: #...;           /* Red / Overdue / Expense */
  --danger-bg: rgba(...);
  --info: #...;             /* Blue / Neutral */
  --info-bg: rgba(...);

  /* Spacing & Radii (Do not change unless requesting a shape overhaul) */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
}

/* ===== [YOUR THEME NAME] LIGHT THEME ===== */
[data-theme='light'] {
  /* You must provide the exact same variables above, but tuned for Light Mode */
  --bg-color: #...; 
  --panel-bg: rgba(255, 255, 255, 1); /* Usually pure white or off-white */
  --text-primary: #...; /* Dark text for readability */
  /* ... provide ALL variables mapped for light mode ... */
}
```

---

## 4. Instructions for AI Color Palette Generation

When generating a new color palette for this application, please ensure:
1. **Contrast is King**: The `--text-primary` must have a WCAG AA contrast ratio against `--panel-bg` and `--bg-color`.
2. **Widget Separation**: The `--bg-color` (the main canvas) and the `--panel-bg` (the widget cards) must be distinct enough so that the cards visually "pop" off the background. 
3. **Data Clarity**: The Semantic colors (`--success`, `--warning`, `--danger`) must be easily distinguishable for financial reports (e.g., distinguishing Revenue from Expenses instantly).
4. **RGBA is Required**: Variables like `--panel-bg` and `--success-bg` are intentionally `rgba()` to allow for glassmorphic blending or faint badge backgrounds. Always provide valid `rgba(r, g, b, alpha)` values.
5. **No Missing Variables**: Do not omit any variable from the template above; the UI will break if a variable is missing.

---

## 5. Technology Stack Context
- **Framework**: React 18 + Vite
- **Styling Method**: Pure CSS leveraging CSS Variables (NO Tailwind, NO SCSS).
- **Icons**: `lucide-react` (Inherit `currentColor` from typography variables).
- **State**: React Context API (`StoreContext.jsx`) synced with Supabase PostgreSQL.

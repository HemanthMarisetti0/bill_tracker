# Bill Tracker

A web app for tracking household bills and expenses. Sign in with Google, log bills by category, and see what's paid and what's still due.

Built with React, TypeScript, Vite and Firebase (Authentication + Cloud Firestore).

## Features

- Google sign-in
- Add, edit and delete bills across 40+ categories, grouped into Utilities, Home & Finance, Household, Health & Lifestyle, and Travel & Others
- Meter-based bills (Water, Electricity, Gas) take previous and current readings plus a rate and work out consumption and amount for you. You can set each meter's starting reading and rate, or enter an amount directly when there's no reading
- Recurring bills: mark a bill as recurring and an unpaid copy is added each month
- Mark bills as paid or unpaid, with due dates, payment dates and notes. Overdue bills are flagged
- Dashboard totals (in ₹), plus this month vs last month
- Monthly summary by category, with optional monthly budgets that warn at 80% and when you go over
- Search and filter bills by period, category and status, and download them as CSV
- Preferred name used in the welcome message (click your name in the top bar to set it)
- Light and dark mode: follows your system setting, or switch with the sun/moon button

## Getting started

### Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/)
- A Firebase project with **Authentication** (Google provider enabled) and **Cloud Firestore**

### Install

```bash
pnpm install
```

### Configure Firebase

Create a `.env` file in the project root with your Firebase web app config:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

You can find these values in the Firebase console under **Project settings → Your apps**. `.env` is git-ignored, so don't commit it.

### Run

```bash
pnpm dev
```

Then open the URL Vite prints (usually http://localhost:5173).

## Scripts

| Command        | What it does                          |
| -------------- | ------------------------------------- |
| `pnpm dev`     | Start the dev server with hot reload  |
| `pnpm build`   | Type-check and build to `dist/`       |
| `pnpm preview` | Serve the production build locally    |
| `pnpm lint`    | Run ESLint                            |

## Data model

All data is stored per user in Firestore:

| Path                                | What it holds                                   |
| ----------------------------------- | ----------------------------------------------- |
| `users/{userId}/bills/{billId}`     | One bill                                        |
| `users/{userId}/settings/meters`    | Starting reading and rate for each meter        |
| `users/{userId}/settings/budgets`   | Monthly budget per category, in ₹               |
| `users/{userId}/settings/profile`   | `preferredName`                                 |

Each bill has a `category`, `billingDate`, `amount` and `status` (`paid` / `unpaid`). The other fields are optional: meter readings, `consumption`, `unit`, `rate`, `dueDate`, `paymentDate`, `notes` and the recurring fields. See [src/types/bill.ts](src/types/bill.ts) for the full types.

[firestore.rules](firestore.rules) only lets a signed-in user read and write their own data. After changing it, deploy with:

```bash
firebase deploy --only firestore:rules
```

## Project structure

```
src/
  components/   Bill form and table, dialogs (meters, budgets, profile),
                summaries, theme toggle, credits footer
  context/      Auth context and provider
  lib/          Firebase and Firestore setup, categories, dates, theme
  pages/        Login and Dashboard
  services/     Auth, bills, recurring bills, bill calculations,
                meter settings, budgets, profile
  types/        Shared TypeScript types
```

The Login and Dashboard pages are loaded on demand, and Firestore is set up in its own file ([src/lib/firestore.ts](src/lib/firestore.ts)), so the login page doesn't download the Firestore SDK.

## Theming

Colors are defined so they work in both light and dark mode:

- Shared colors live in [src/index.css](src/index.css): `--page`, `--surface`, `--surface-subtle`, `--surface-muted`, `--text`, `--text-secondary`, `--text-muted`, `--text-subtle`, `--border`, `--border-strong`.
- Any other color is written as `light-dark(<light color>, <dark color>)`.

When adding styles, use one of these. A plain color like `#ffffff` will look the same in both themes. The chosen theme is saved in the browser's local storage.

## Adding a bill category

1. Add the new value to `BillCategory` in [src/types/bill.ts](src/types/bill.ts).
2. Add its label, icon and description to `categoryConfig` in [src/lib/categories.ts](src/lib/categories.ts), and add it to one of the `categoryGroups` there.
3. Add a badge color for it (`.bill-category-badge.<category>`) in [src/components/BillTable.css](src/components/BillTable.css), using `light-dark()` so it works in dark mode.

## Credits

Designed by Hemanth · Instagram [@hemanthononline](https://www.instagram.com/hemanthononline/) · GitHub [HemanthMarisetti0](https://github.com/HemanthMarisetti0)

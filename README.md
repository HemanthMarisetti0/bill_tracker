# Bill Tracker

A web app for tracking household bills and expenses. Sign in with Google, log bills by category, and see what's paid and what's still due.

Built with React, TypeScript, Vite and Firebase (Authentication + Cloud Firestore).

## Features

- Google sign-in
- Add, edit and delete bills
- Bill categories: Water, Electricity, Gas, Internet, Rent, Maintenance, Mobile, Food, Travel, Other
- Meter-based bills (Water, Electricity, Gas) take previous and current readings plus a rate, and work out consumption and amount for you
- Mark bills as paid or unpaid, with an optional payment date and notes
- Dashboard totals: number of bills, total amount, paid and unpaid amounts (in ₹)

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

Bills are stored per user in Firestore at:

```
users/{userId}/bills/{billId}
```

Each bill has a `category`, `billingDate`, `amount` and `status` (`paid` / `unpaid`). The other fields are optional: meter readings, `consumption`, `unit`, `rate`, `paymentDate` and `notes`. See [src/types/bill.ts](src/types/bill.ts) for the full type.

[src/services/migrationService.ts](src/services/migrationService.ts) can copy bills from this per-user path into a shared `households/{householdId}/bills` collection. It never deletes the original bills.

## Project structure

```
src/
  components/   BillForm, BillTable, Layout
  context/      Auth context and provider
  lib/          Firebase initialisation
  pages/        Login and Dashboard
  services/     Auth, bill CRUD, bill calculations, migration
  types/        Shared TypeScript types
```

## Adding a bill category

1. Add the new value to `BillCategory` in [src/types/bill.ts](src/types/bill.ts).
2. Add its label, icon and description to the category config in [src/components/BillForm.tsx](src/components/BillForm.tsx), then add it to the `categories` list there.
3. Add its display label in [src/components/BillTable.tsx](src/components/BillTable.tsx).

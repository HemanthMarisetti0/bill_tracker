# Bill Tracker

A web app for tracking household bills, salary, investments and savings. Sign in with Google, log bills by type, record your salary, and see what's paid, what's still due, and how much is left each month.

Built with React, TypeScript, Vite and Firebase (Authentication + Cloud Firestore).

## Features

The dashboard is split into six tabs.

### 📊 Overview

Each block has a heading and a short line explaining what it shows.

- **Your money this month:** **Income**, **Spent on bills**, **Invested**, **Saved** and **Left this month**, each with a hint saying what it counts
- A plain-English line such as *"Out of ₹50,000 income, you spent ₹22,000 on bills, invested ₹10,000 and saved ₹5,000. ₹13,000 (26%) is still left."*, plus a colored bar and legend showing what share of income went to bills, investments, savings and what's left
- A reminder to **add this month's salary** if you haven't yet
- **Bills: this month vs last month**, showing whether you're spending more or less on bills than last month. Investments and savings aren't counted
- **Where your money went:** spending by type for any month, with optional monthly budgets that warn at 80% and when you go over. Click a type to see its bills

### 🧾 Bills

- Add, edit and delete bills across 40+ built-in types, grouped into Utilities, Home & Finance, Household, Health & Lifestyle, and Travel & Others
- Meter-based bills (Water, Electricity, Gas) take previous and current readings plus a rate and work out consumption and amount for you. You can set each meter's starting reading and rate (**Meter Settings**), or enter an amount directly when there's no reading
- Recurring bills: tick **Repeat every month** and an unpaid copy is added at the start of each month
- Mark bills as paid or unpaid, with due dates, payment dates and notes. Overdue bills are flagged
- Optional **payment method**: UPI, credit card, debit card, net banking, auto-debit, cash, wallet or other. It's shown under the bill's status, and monthly copies of a recurring bill keep it
- Totals for all bills: count, amount, paid, unpaid and overdue
- Search and filter by period, type, status and payment method, and download the result as CSV

### 📈 Investments

- Bills in the **Investments / SIP** type get their own table instead of appearing under Bills
- Totals for this month, this year and all time, plus the number of monthly SIPs
- Investments are treated as money set aside, not spending, so they're left out of bill totals, the month comparison and the monthly summary

### 🐷 Savings

- Bills in the **Savings** type (money put into savings, FDs or an emergency fund) get their own tab, separate from investments
- Totals for this month, this year and all time, plus the number of monthly savings entries
- Like investments, savings are left out of spending. On the Overview they're shown as **Saved**

### 💼 Income

- Record salary and other income: bonus, freelance, rental, interest/dividends, or other
- Each entry has an amount, the date received and optional notes
- Filter by this month, this year or all time, with totals for all income and for salary alone

### 🏷️ Types

- A table of every bill type, showing its group, how many bills use it, and whether it's shown or hidden
- **Add your own types** with a name, an emoji icon and a group. They appear in the bill form straight away
- **Hide** types you don't use. They're left out of the bill form, the type filter and the budgets dialog. Bills that already use a hidden type still show it
- **Delete** types you added. A type that's still used by bills can't be deleted, but it can be hidden. Built-in types can be hidden but not deleted
- Filter the table by all / shown / hidden, and search by type or group name

### Everywhere

- Google sign-in
- Preferred name used in the welcome message (click your name in the top bar to set it)
- Light and dark mode: follows your system setting, or switch with the sun/moon button
- Works on phones: tables turn into cards and the tabs scroll sideways

## Getting started

### Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/)
- A Firebase project with **Authentication** (Google provider enabled) and **Cloud Firestore**
- The [Firebase CLI](https://firebase.google.com/docs/cli), to deploy the Firestore security rules

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

### Deploy the security rules

The app won't be able to read or write data until the rules in [firestore.rules](firestore.rules) are deployed:

```bash
firebase deploy --only firestore:rules
```

Run this again whenever the rules change. For example, saving income needs the rule for the `income` collection.

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

| Path                                   | What it holds                                         |
| -------------------------------------- | ----------------------------------------------------- |
| `users/{userId}/bills/{billId}`        | One bill (investments and savings are bills too)      |
| `users/{userId}/income/{incomeId}`     | One salary or other income entry                      |
| `users/{userId}/settings/meters`       | Starting reading and rate for each meter              |
| `users/{userId}/settings/budgets`      | Monthly budget per type, in ₹                         |
| `users/{userId}/settings/categories`   | Your own types (`custom`) and hidden types (`hidden`) |
| `users/{userId}/settings/profile`      | `preferredName`                                       |

- **Bill:** `category`, `billingDate`, `amount` and `status` (`paid` / `unpaid`). Optional fields: meter readings, `consumption`, `unit`, `rate`, `dueDate`, `paymentDate`, `paymentMethod` (`upi`, `credit-card`, `debit-card`, `net-banking`, `auto-debit`, `cash`, `wallet`, `other`), `notes` and the recurring fields. `category` is either a built-in type (such as `water`, `investments` or `savings`) or the id of one of your own types (`custom-…`).
- **Income:** `source` (`salary`, `bonus`, `freelance`, `rental`, `interest`, `other`), `amount`, `date` and optional `notes`.
- **Types:** each entry in `custom` has an `id`, `label`, `icon` and `group` (the name of the group it's listed under). `hidden` is a list of type ids.

See [src/types/bill.ts](src/types/bill.ts) for the full types.

[firestore.rules](firestore.rules) only lets a signed-in user read and write their own data.

## Project structure

```
src/
  components/   Bill form and table, income form and table, type form
                and table, dialogs (meters, budgets, profile), overview
                summaries, theme toggle, credits footer
  context/      Auth context, and the types context that combines
                built-in and your own types
  lib/          Firebase and Firestore setup, categories (types),
                income sources, payment methods, dates, theme
  pages/        Login and Dashboard (with its tabs)
  services/     Auth, bills, recurring bills, bill calculations, income,
                types, meter settings, budgets, profile
  types/        Shared TypeScript types
```

The Login and Dashboard pages are loaded on demand, and Firestore is set up in its own file ([src/lib/firestore.ts](src/lib/firestore.ts)), so the login page doesn't download the Firestore SDK.

Components get the list of types from `useCategories()` ([src/context/useCategories.ts](src/context/useCategories.ts)), not straight from `categoryConfig`. That way your own types and hidden types are included. The list is built by `buildCategoryCatalog()` in [src/lib/categories.ts](src/lib/categories.ts).

## Theming

Colors are defined so they work in both light and dark mode:

- Shared colors live in [src/index.css](src/index.css): `--page`, `--surface`, `--surface-subtle`, `--surface-muted`, `--text`, `--text-secondary`, `--text-muted`, `--text-subtle`, `--border`, `--border-strong`.
- Any other color is written as `light-dark(<light color>, <dark color>)`.

When adding styles, use one of these. A plain color like `#ffffff` will look the same in both themes. The chosen theme is saved in the browser's local storage.

## Adding a built-in bill type

You can add your own types from the **Types** tab without changing any code. To add a type that every user gets:

1. Add the new value to `BillCategory` in [src/types/bill.ts](src/types/bill.ts).
2. Add its label, icon and description to `categoryConfig` in [src/lib/categories.ts](src/lib/categories.ts), and add it to one of the `categoryGroups` there.
3. Add a badge color for it (`.bill-category-badge.<category>`) in [src/components/BillTable.css](src/components/BillTable.css), using `light-dark()` so it works in dark mode.

## Credits

Designed by Hemanth · Instagram [@hemanthononline](https://www.instagram.com/hemanthononline/) · GitHub [HemanthMarisetti0](https://github.com/HemanthMarisetti0)

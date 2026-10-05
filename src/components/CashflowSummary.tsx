import { getCurrentMonthKey, toMonthKey } from "../lib/dates";

import type { Bill, Income } from "../types/bill";

interface CashflowSummaryProps {
  expenses: Bill[];
  investments: Bill[];
  income: Income[];
  loading: boolean;
  onAddSalary: () => void;
}

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);

  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
  });
}

function sumThisMonth<T>(
  items: T[],
  monthKey: string,
  getDate: (item: T) => string,
  getAmount: (item: T) => number,
) {
  return items
    .filter((item) => toMonthKey(getDate(item)) === monthKey)
    .reduce((total, item) => total + Number(getAmount(item) || 0), 0);
}

/*
 * This month's money in, money out,
 * money invested and what's left.
 */
export default function CashflowSummary({
  expenses,
  investments,
  income,
  loading,
  onAddSalary,
}: CashflowSummaryProps) {
  const month = getCurrentMonthKey();

  const earned = sumThisMonth(
    income,
    month,
    (entry) => entry.date,
    (entry) => entry.amount,
  );

  const spent = sumThisMonth(
    expenses,
    month,
    (bill) => bill.billingDate,
    (bill) => bill.amount,
  );

  const invested = sumThisMonth(
    investments,
    month,
    (bill) => bill.billingDate,
    (bill) => bill.amount,
  );

  const left = earned - spent - invested;

  const hasSalary = income.some(
    (entry) => entry.source === "salary" && toMonthKey(entry.date) === month,
  );

  const cards = [
    { label: "Income", value: earned, className: "income" },
    { label: "Spent on bills", value: spent, className: "" },
    { label: "Invested", value: invested, className: "invested" },
    {
      label: "Left this month",
      value: left,
      className: left < 0 ? "negative" : "positive",
    },
  ];

  return (
    <section className="cashflow" aria-label={`${formatMonth(month)} cash flow`}>
      {!loading && !hasSalary && (
        <div className="cashflow-prompt">
          <span className="cashflow-prompt-icon" aria-hidden="true">
            💼
          </span>

          <div>
            <strong>Add your {formatMonth(month)} salary</strong>

            <span>
              See how much is left after bills and investments this month.
            </span>
          </div>

          <button type="button" className="add-bill-button" onClick={onAddSalary}>
            + Add Salary
          </button>
        </div>
      )}

      <div className="dashboard-stats">
        {cards.map((card) => (
          <div key={card.label} className={`stat-card cashflow-card ${card.className}`}>
            <span className="stat-label">
              {card.label} · {formatMonth(month)}
            </span>

            {loading ? (
              <span className="skeleton stat-skeleton" />
            ) : (
              <strong className="stat-value">
                {card.value < 0 ? "−" : ""}
                {formatCurrency(Math.abs(card.value))}
              </strong>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

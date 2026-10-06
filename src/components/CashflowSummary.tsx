import { getCurrentMonthKey, toMonthKey } from "../lib/dates";

import type { Bill, Income } from "../types/bill";

interface CashflowSummaryProps {
  expenses: Bill[];
  investments: Bill[];
  savings: Bill[];
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
 * money invested, money saved
 * and what's left.
 */
export default function CashflowSummary({
  expenses,
  investments,
  savings,
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

  const saved = sumThisMonth(
    savings,
    month,
    (bill) => bill.billingDate,
    (bill) => bill.amount,
  );

  const left = earned - spent - invested - saved;

  const hasSalary = income.some(
    (entry) => entry.source === "salary" && toMonthKey(entry.date) === month,
  );

  const cards = [
    {
      label: "Income",
      value: earned,
      className: "income",
      hint: "Salary and other money in",
    },
    {
      label: "Spent on bills",
      value: spent,
      className: "spent",
      hint: "All bills added this month",
    },
    {
      label: "Invested",
      value: invested,
      className: "invested",
      hint: "SIPs, RDs, PPF and more",
    },
    {
      label: "Saved",
      value: saved,
      className: "saved",
      hint: "Savings, FDs, emergency fund",
    },
    {
      label: "Left this month",
      value: left,
      className: left < 0 ? "negative" : "positive",
      hint:
        left < 0
          ? "More went out than came in"
          : "Income minus everything above",
    },
  ];

  /*
   * Parts of the income bar; the bar is as wide
   * as income, or as money out if that's more.
   */
  const barTotal = Math.max(earned, spent + invested + saved, 1);

  const segments = [
    { label: "Bills", value: spent, className: "spent" },
    { label: "Invested", value: invested, className: "invested" },
    { label: "Saved", value: saved, className: "saved" },
    { label: "Left", value: Math.max(left, 0), className: "left" },
  ].filter((segment) => segment.value > 0);

  function percentOfIncome(value: number) {
    return `${Math.round((value / earned) * 100)}%`;
  }

  return (
    <section
      className="cashflow"
      aria-label={`${formatMonth(month)} cash flow`}
    >
      <div className="overview-heading">
        <h3>Your money in {formatMonth(month)}</h3>

        <p>What came in, what went out, and what you have left.</p>
      </div>

      {!loading && !hasSalary && (
        <div className="cashflow-prompt">
          <span className="cashflow-prompt-icon" aria-hidden="true">
            💼
          </span>

          <div>
            <strong>Add your {formatMonth(month)} salary</strong>

            <span>
              See how much is left after bills, investments and savings this
              month.
            </span>
          </div>

          <button
            type="button"
            className="add-bill-button"
            onClick={onAddSalary}
          >
            + Add Salary
          </button>
        </div>
      )}

      <div className="dashboard-stats">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`stat-card cashflow-card ${card.className}`}
          >
            <span className="stat-label">{card.label}</span>

            {loading ? (
              <span className="skeleton stat-skeleton" />
            ) : (
              <strong className="stat-value">
                {card.value < 0 ? "−" : ""}
                {formatCurrency(Math.abs(card.value))}
              </strong>
            )}

            <span className="stat-hint">{card.hint}</span>
          </div>
        ))}
      </div>

      {!loading && earned > 0 && (
        <div className="cashflow-breakdown">
          <p className="cashflow-sentence">
            Out of <strong>{formatCurrency(earned)}</strong> income, you spent{" "}
            <strong>{formatCurrency(spent)}</strong> on bills, invested{" "}
            <strong>{formatCurrency(invested)}</strong> and saved{" "}
            <strong>{formatCurrency(saved)}</strong>.{" "}
            {left >= 0 ? (
              <>
                <strong className="cashflow-left">
                  {formatCurrency(left)}
                </strong>{" "}
                ({percentOfIncome(left)}) is still left.
              </>
            ) : (
              <>
                That's{" "}
                <strong className="cashflow-over">
                  {formatCurrency(Math.abs(left))}
                </strong>{" "}
                more than you earned.
              </>
            )}
          </p>

          <div
            className="cashflow-bar"
            role="img"
            aria-label={segments
              .map(
                (segment) =>
                  `${segment.label} ${percentOfIncome(segment.value)} of income`,
              )
              .join(", ")}
          >
            {segments.map((segment) => (
              <span
                key={segment.label}
                className={`cashflow-bar-part ${segment.className}`}
                style={{ width: `${(segment.value / barTotal) * 100}%` }}
                title={`${segment.label}: ${formatCurrency(segment.value)} (${percentOfIncome(segment.value)} of income)`}
              />
            ))}
          </div>

          <ul className="cashflow-legend">
            {segments.map((segment) => (
              <li key={segment.label}>
                <span
                  className={`cashflow-legend-dot ${segment.className}`}
                  aria-hidden="true"
                />
                {segment.label} · {percentOfIncome(segment.value)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

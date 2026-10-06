import { useMemo } from "react";

import { addMonths, getCurrentMonthKey, toMonthKey } from "../lib/dates";

import type { Bill } from "../types/bill";

import "./Loader.css";
import "./MonthComparison.css";

interface MonthComparisonProps {
  bills: Bill[];
  loading: boolean;
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
    year: "numeric",
  });
}

function sumMonth(bills: Bill[], monthKey: string) {
  let total = 0;
  let count = 0;

  for (const bill of bills) {
    if (toMonthKey(bill.billingDate) === monthKey) {
      total += Number(bill.amount || 0);
      count += 1;
    }
  }

  return { total, count };
}

export default function MonthComparison({
  bills,
  loading,
}: MonthComparisonProps) {
  const currentMonth = getCurrentMonthKey();

  const lastMonth = toMonthKey(addMonths(`${currentMonth}-01`, -1));

  const { current, previous } = useMemo(
    () => ({
      current: sumMonth(bills, currentMonth),
      previous: sumMonth(bills, lastMonth),
    }),
    [bills, currentMonth, lastMonth],
  );

  /*
   * Positive means less spent this
   * month than last month.
   */
  const saved = previous.total - current.total;

  const savedPercent =
    previous.total > 0
      ? Math.round((Math.abs(saved) / previous.total) * 100)
      : 0;

  const usedOfLastMonth =
    previous.total > 0 ? (current.total / previous.total) * 100 : 0;

  const trend =
    previous.total === 0
      ? "none"
      : saved > 0
        ? "saved"
        : saved < 0
          ? "more"
          : "same";

  return (
    <section aria-label="Bills this month vs last month">
      <div className="overview-heading">
        <h3>Bills: this month vs last month</h3>

        <p>
          Are you spending more or less on bills than last month? Investments
          and savings aren't counted here.
        </p>
      </div>

      <div className="month-comparison">
        <div className="month-card">
          <span className="month-card-label">
            <span className="month-card-dot current" aria-hidden="true" />
            Bills this month · {formatMonth(currentMonth)}
          </span>

          {loading ? (
            <span className="skeleton month-card-skeleton" />
          ) : (
            <strong className="month-card-value">
              {formatCurrency(current.total)}
            </strong>
          )}

          <span className="month-card-note">
            {current.count} {current.count === 1 ? "bill" : "bills"} so far
          </span>
        </div>

        <div className="month-card">
          <span className="month-card-label">
            <span className="month-card-dot previous" aria-hidden="true" />
            Bills last month · {formatMonth(lastMonth)}
          </span>

          {loading ? (
            <span className="skeleton month-card-skeleton" />
          ) : (
            <strong className="month-card-value">
              {formatCurrency(previous.total)}
            </strong>
          )}

          <span className="month-card-note">
            {previous.count} {previous.count === 1 ? "bill" : "bills"}
          </span>
        </div>

        <div
          className={`month-card month-card-savings ${loading ? "" : trend}`}
        >
          <span className="month-card-label">
            {trend === "more"
              ? "Spending more than last month"
              : trend === "saved"
                ? "Spending less than last month"
                : "Difference from last month"}
          </span>

          {loading ? (
            <span className="skeleton month-card-skeleton" />
          ) : (
            <strong className="month-card-value">
              {trend === "none" ? "—" : formatCurrency(Math.abs(saved))}

              {trend === "saved" || trend === "more" ? (
                <span className="month-card-badge">
                  <span aria-hidden="true">
                    {trend === "saved" ? "↓" : "↑"}
                  </span>{" "}
                  {savedPercent}%
                </span>
              ) : null}
            </strong>
          )}

          {!loading && trend !== "none" && (
            <div
              className="month-card-meter"
              title={`${Math.round(usedOfLastMonth)}% of last month's total`}
            >
              <span style={{ width: `${Math.min(usedOfLastMonth, 100)}%` }} />
            </div>
          )}

          <span className="month-card-note">
            {loading
              ? "Comparing months..."
              : trend === "none"
                ? "No bills last month to compare with."
                : trend === "same"
                  ? "Exactly the same as last month."
                  : `So far you've spent ${Math.round(usedOfLastMonth)}% of what you spent on bills last month.`}
          </span>
        </div>
      </div>
    </section>
  );
}

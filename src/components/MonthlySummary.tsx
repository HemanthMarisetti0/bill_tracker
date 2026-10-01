import { useMemo, useState } from "react";

import { categories, categoryConfig } from "../lib/categories";
import {
  addMonths,
  getCurrentMonthKey,
  isOverdue,
  toMonthKey,
} from "../lib/dates";

import type { Bill, BillCategory, Budgets } from "../types/bill";

import ChevronIcon from "./ChevronIcon";

import "./MonthlySummary.css";

interface MonthlySummaryProps {
  bills: Bill[];
  budgets: Budgets;
  onEditBudgets: () => void;
}

interface SummaryRow {
  category: BillCategory;
  spent: number;
  count: number;
  budget?: number;
  bills: Bill[];
}

/*
 * Share of budget at which a
 * category gets a warning.
 */
const WARNING_THRESHOLD = 0.8;

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

function formatDay(value: string): string {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function shiftMonth(monthKey: string, months: number): string {
  return toMonthKey(addMonths(`${monthKey}-01`, months));
}

function getBudgetStatus(row: SummaryRow) {
  if (!row.budget) {
    return null;
  }

  const ratio = row.spent / row.budget;

  if (ratio > 1) {
    return {
      level: "over",
      icon: "⛔",
      text: `Over by ${formatCurrency(row.spent - row.budget)}`,
    };
  }

  if (ratio >= WARNING_THRESHOLD) {
    return {
      level: "warning",
      icon: "⚠️",
      text: `${Math.round(ratio * 100)}% used`,
    };
  }

  return {
    level: "ok",
    icon: "✓",
    text: `${formatCurrency(row.budget - row.spent)} left`,
  };
}

export default function MonthlySummary({
  bills,
  budgets,
  onEditBudgets,
}: MonthlySummaryProps) {
  const currentMonth = getCurrentMonthKey();

  const [month, setMonth] = useState(currentMonth);

  const [collapsed, setCollapsed] = useState(false);

  /*
   * Category whose bills are listed
   * under its row, if any.
   */
  const [expanded, setExpanded] = useState<BillCategory | null>(null);

  function changeMonth(months: number) {
    setMonth((value) => shiftMonth(value, months));
    setExpanded(null);
  }

  const rows = useMemo(() => {
    const totals = new Map<BillCategory, { spent: number; bills: Bill[] }>();

    for (const bill of bills) {
      if (toMonthKey(bill.billingDate) !== month) {
        continue;
      }

      const total = totals.get(bill.category) ?? { spent: 0, bills: [] };

      total.spent += Number(bill.amount || 0);
      total.bills.push(bill);

      totals.set(bill.category, total);
    }

    /*
     * Show every category with spending
     * or a budget, biggest spend first.
     */
    return categories
      .map((category): SummaryRow => ({
        category,
        spent: totals.get(category)?.spent ?? 0,
        count: totals.get(category)?.bills.length ?? 0,
        budget: budgets[category] || undefined,
        bills: (totals.get(category)?.bills ?? []).sort((a, b) =>
          a.billingDate.localeCompare(b.billingDate),
        ),
      }))
      .filter((row) => row.count > 0 || row.budget)
      .sort((a, b) => b.spent - a.spent);
  }, [bills, budgets, month]);

  const totalSpent = rows.reduce((total, row) => total + row.spent, 0);

  const totalBudget = rows.reduce((total, row) => total + (row.budget ?? 0), 0);

  /*
   * One shared scale so bars and budget
   * markers compare across categories.
   */
  const scale = Math.max(
    1,
    ...rows.map((row) => Math.max(row.spent, row.budget ?? 0)),
  );

  const alerts = rows.filter((row) => {
    const status = getBudgetStatus(row);

    return status && status.level !== "ok";
  }).length;

  return (
    <section className={`monthly-summary ${collapsed ? "collapsed" : ""}`}>
      <div className="monthly-summary-header">
        <button
          type="button"
          className="monthly-summary-toggle"
          aria-expanded={!collapsed}
          aria-controls="monthly-summary-body"
          onClick={() => setCollapsed((value) => !value)}>
          <span className="monthly-summary-chevron" aria-hidden="true">
            <ChevronIcon />
          </span>

          <span>
            <h3>Monthly Summary</h3>

            <p>
              {collapsed
                ? `${formatMonth(month)} · ${formatCurrency(totalSpent)} spent`
                : "Where your money went. Tap a category to see its bills."}
            </p>
          </span>
        </button>

        <div className="monthly-summary-controls">
          <div className="monthly-summary-month" role="group" aria-label="Month">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              aria-label="Previous month">
              ‹
            </button>

            <span>{formatMonth(month)}</span>

            <button
              type="button"
              onClick={() => changeMonth(1)}
              disabled={month >= currentMonth}
              aria-label="Next month">
              ›
            </button>
          </div>

          <button
            type="button"
            className="monthly-summary-budget-button"
            onClick={onEditBudgets}>
            🎯 Set Budgets
          </button>
        </div>
      </div>

      {!collapsed && (
        <div id="monthly-summary-body">
          <div className="monthly-summary-totals">
            <div>
              <span>Spent</span>
              <strong>{formatCurrency(totalSpent)}</strong>
            </div>

            {totalBudget > 0 && (
              <div>
                <span>Budgeted</span>
                <strong>{formatCurrency(totalBudget)}</strong>
              </div>
            )}

            {alerts > 0 && (
              <div className="monthly-summary-alerts">
                <span>Needs attention</span>
                <strong>
                  ⚠️ {alerts} {alerts === 1 ? "category" : "categories"}
                </strong>
              </div>
            )}
          </div>

          {rows.length === 0 ? (
            <div className="monthly-summary-empty">
              No spending in {formatMonth(month)}.
            </div>
          ) : (
            <ul className="monthly-summary-list">
              {rows.map((row) => {
                const config = categoryConfig[row.category];

                const status = getBudgetStatus(row);

                const share = totalSpent > 0 ? row.spent / totalSpent : 0;

                const tooltip = [
                  `${config.label}: ${formatCurrency(row.spent)}`,
                  `${row.count} ${row.count === 1 ? "bill" : "bills"}`,
                  `${Math.round(share * 100)}% of the month`,
                  row.budget ? `Budget ${formatCurrency(row.budget)}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ");

                const isExpanded = expanded === row.category;

                const detailsId = `monthly-summary-${row.category}`;

                return (
                  <li
                    key={row.category}
                    className={`monthly-summary-item ${isExpanded ? "expanded" : ""}`}>
                    <button
                      type="button"
                      className="monthly-summary-row"
                      title={tooltip}
                      disabled={row.count === 0}
                      aria-expanded={row.count > 0 ? isExpanded : undefined}
                      aria-controls={row.count > 0 ? detailsId : undefined}
                      onClick={() =>
                        setExpanded(isExpanded ? null : row.category)
                      }>
                      <span className="monthly-summary-label">
                        <span className="monthly-summary-icon">{config.icon}</span>
                        <span>{config.label}</span>
                      </span>

                      <span className="monthly-summary-bar">
                        <span
                          className="monthly-summary-fill"
                          style={{ width: `${(row.spent / scale) * 100}%` }}
                        />

                        {row.budget && (
                          <span
                            className="monthly-summary-marker"
                            style={{ left: `${(row.budget / scale) * 100}%` }}
                            aria-hidden="true"
                          />
                        )}
                      </span>

                      <span className="monthly-summary-value">
                        <strong>{formatCurrency(row.spent)}</strong>

                        {row.budget ? (
                          <span>of {formatCurrency(row.budget)}</span>
                        ) : (
                          <span>{Math.round(share * 100)}%</span>
                        )}
                      </span>

                      <span className="monthly-summary-status">
                        {status && (
                          <span className={`budget-status ${status.level}`}>
                            <span aria-hidden="true">{status.icon}</span> {status.text}
                          </span>
                        )}
                      </span>

                      <span className="monthly-summary-row-chevron" aria-hidden="true">
                        {row.count > 0 && <ChevronIcon />}
                      </span>
                    </button>

                    {isExpanded && (
                      <ul id={detailsId} className="monthly-summary-bills">
                        {row.bills.map((bill) => (
                          <li key={bill.id}>
                            <span className="monthly-summary-bill-date">
                              {formatDay(bill.billingDate)}
                            </span>

                            <span className="monthly-summary-bill-notes">
                              {bill.notes || `${config.label} bill`}
                            </span>

                            <span
                              className={`monthly-summary-bill-status ${
                                isOverdue(bill) ? "overdue" : bill.status
                              }`}>
                              {isOverdue(bill)
                                ? "Overdue"
                                : bill.status === "paid"
                                  ? "Paid"
                                  : "Unpaid"}
                            </span>

                            <strong>{formatCurrency(Number(bill.amount || 0))}</strong>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

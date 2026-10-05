import { useMemo, useState } from "react";

import { getCurrentMonthKey, toMonthKey } from "../lib/dates";
import { incomeSourceConfig } from "../lib/income";

import type { Income } from "../types/bill";

import "./BillTable.css";

interface IncomeTableProps {
  income: Income[];
  onEdit: (income: Income) => void;
  onDelete: (incomeId: string) => void;
}

type Period = "this-month" | "this-year" | "all";

function formatDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const periodLabels: Record<Period, string> = {
  "this-month": "This month",
  "this-year": "This year",
  all: "All time",
};

export default function IncomeTable({
  income,
  onEdit,
  onDelete,
}: IncomeTableProps) {
  const [period, setPeriod] = useState<Period>("this-month");

  const currentMonth = getCurrentMonthKey();

  const filtered = useMemo(
    () =>
      income.filter((entry) => {
        if (period === "this-month") {
          return toMonthKey(entry.date) === currentMonth;
        }

        if (period === "this-year") {
          return entry.date.slice(0, 4) === currentMonth.slice(0, 4);
        }

        return true;
      }),
    [income, period, currentMonth],
  );

  const total = filtered.reduce(
    (sum, entry) => sum + Number(entry.amount || 0),
    0,
  );

  const salary = filtered
    .filter((entry) => entry.source === "salary")
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

  if (income.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">💼</div>

        <h3>No income yet</h3>

        <p>Add your salary to see how much is left after bills.</p>
      </div>
    );
  }

  return (
    <div className="bill-table-wrapper">
      <div className="bill-date-filter">
        <div className="bill-period-tabs" role="group" aria-label="Period">
          {(Object.keys(periodLabels) as Period[]).map((item) => (
            <button
              key={item}
              type="button"
              className={period === item ? "active" : ""}
              onClick={() => setPeriod(item)}>
              {periodLabels[item]}
            </button>
          ))}
        </div>
      </div>

      <div className="bill-summary">
        <div className="bill-summary-item">
          <span>Entries · {periodLabels[period].toLowerCase()}</span>
          <strong>
            {filtered.length}
            <small> of {income.length}</small>
          </strong>
        </div>

        <div className="bill-summary-item paid">
          <span>Total income</span>
          <strong>{formatCurrency(total)}</strong>
        </div>

        <div className="bill-summary-item">
          <span>Salary</span>
          <strong>{formatCurrency(salary)}</strong>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-filter-state">
          <div className="empty-state-icon">🗓️</div>

          <h3>No income for {periodLabels[period].toLowerCase()}</h3>

          <p>Try another period.</p>

          <button type="button" onClick={() => setPeriod("all")}>
            Show all time
          </button>
        </div>
      ) : (
        <div className="bill-table-container">
          <table className="bill-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Received</th>
                <th className="align-right">Amount</th>
                <th className="align-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((entry) => {
                const config = incomeSourceConfig[entry.source] ??
                  incomeSourceConfig.other;

                return (
                  <tr key={entry.id}>
                    <td data-label="Source">
                      <div className="bill-category-cell">
                        <span className="bill-category-badge income">
                          {config.icon}
                        </span>

                        <div>
                          <span className="category-name">{config.label}</span>

                          {entry.notes && (
                            <span className="bill-notes" title={entry.notes}>
                              {entry.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td data-label="Received">
                      <span className="bill-date">{formatDate(entry.date)}</span>
                    </td>

                    <td data-label="Amount" className="bill-amount align-right">
                      {formatCurrency(Number(entry.amount || 0))}
                    </td>

                    <td data-label="Actions" className="align-right">
                      <div className="bill-actions">
                        <button
                          type="button"
                          className="edit-button"
                          onClick={() => onEdit(entry)}>
                          Edit
                        </button>

                        <button
                          type="button"
                          className="delete-button"
                          onClick={() => {
                            if (entry.id) {
                              onDelete(entry.id);
                            }
                          }}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot>
              <tr>
                <td colSpan={2}>
                  Total · {filtered.length}{" "}
                  {filtered.length === 1 ? "entry" : "entries"}
                </td>

                <td className="bill-amount align-right">
                  {formatCurrency(total)}
                </td>

                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

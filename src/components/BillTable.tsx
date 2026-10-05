import { useMemo, useState } from "react";

import { useCategories } from "../context/useCategories";
import type { CategoryCatalog } from "../lib/categories";
import { getToday, isOverdue, toDateString } from "../lib/dates";

import type { Bill, BillStatus, CategoryId } from "../types/bill";

import "./BillTable.css";

interface BillTableProps {
  bills: Bill[];
  onDelete: (billId: string) => void;
  onEdit: (bill: Bill) => void;
  /*
   * For tables that only show
   * one category.
   */
  hideCategoryFilter?: boolean;
  emptyIcon?: string;
  emptyTitle?: string;
  emptyMessage?: string;
}

type Period = "this-month" | "last-month" | "all" | "custom";

type StatusFilter = BillStatus | "overdue" | "all";

interface DateRange {
  from: string;
  to: string;
}

function getMonthRange(monthOffset = 0): DateRange {
  const today = new Date();

  const first = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const last = new Date(today.getFullYear(), today.getMonth() + monthOffset + 1, 0);

  return {
    from: toDateString(first),
    to: toDateString(last),
  };
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return value;
  }

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

function getPeriodLabel(period: Period, range: DateRange): string {
  if (period === "all") {
    return "all time";
  }

  if (period === "this-month" || period === "last-month") {
    const [year, month] = range.from.split("-").map(Number);

    return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });
  }

  if (range.from && range.to) {
    return `${formatDate(range.from)} – ${formatDate(range.to)}`;
  }

  if (range.from) {
    return `from ${formatDate(range.from)}`;
  }

  if (range.to) {
    return `until ${formatDate(range.to)}`;
  }

  return "all time";
}

function escapeCsvValue(value: unknown): string {
  const stringValue = String(value ?? "");

  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function downloadBillsAsCsv(
  bills: Bill[],
  range: DateRange,
  catalog: CategoryCatalog,
) {
  const headers = [
    "Date",
    "Category",
    "Previous Reading",
    "Current Reading",
    "Consumption",
    "Unit",
    "Rate",
    "Amount",
    "Status",
    "Payment Date",
    "Due Date",
    "Recurring",
    "Notes",
  ];

  const rows = bills.map((bill) => [
    bill.billingDate,
    catalog.getConfig(bill.category).label,
    bill.previousReading ?? "",
    bill.currentReading ?? "",
    bill.consumption ?? "",
    bill.unit ?? "",
    bill.rate ?? "",
    Number(bill.amount || 0).toFixed(2),
    bill.status.toUpperCase(),
    bill.paymentDate ?? "",
    bill.dueDate ?? "",
    bill.recurring ? "Monthly" : "",
    bill.notes ?? "",
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\r\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  const suffix =
    range.from || range.to
      ? `${range.from || "start"}_to_${range.to || "today"}`
      : toDateString(new Date());

  link.href = url;
  link.download = `bill-tracker-${suffix}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export default function BillTable({
  bills,
  onDelete,
  onEdit,
  hideCategoryFilter = false,
  emptyIcon = "🧾",
  emptyTitle = "No bills yet",
  emptyMessage = "Add your first bill to start tracking.",
}: BillTableProps) {
  const catalog = useCategories();

  const [categoryFilter, setCategoryFilter] = useState<CategoryId | "all">(
    "all",
  );

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [search, setSearch] = useState("");

  /*
   * Always start on the current month.
   */
  const [period, setPeriod] = useState<Period>("this-month");

  const [dateRange, setDateRange] = useState<DateRange>(() => getMonthRange());

  const today = getToday();

  const filteredBills = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return bills.filter((bill) => {
      /*
       * billingDate is YYYY-MM-DD, so plain
       * string comparison orders correctly.
       */
      const matchesDate =
        (!dateRange.from || bill.billingDate >= dateRange.from) &&
        (!dateRange.to || bill.billingDate <= dateRange.to);

      const matchesCategory =
        categoryFilter === "all" || bill.category === categoryFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "overdue"
          ? isOverdue(bill, today)
          : bill.status === statusFilter);

      const matchesSearch =
        !searchValue ||
        catalog
          .getConfig(bill.category)
          .label.toLowerCase()
          .includes(searchValue) ||
        bill.billingDate.toLowerCase().includes(searchValue) ||
        bill.notes?.toLowerCase().includes(searchValue);

      return matchesDate && matchesCategory && matchesStatus && matchesSearch;
    });
  }, [bills, dateRange, categoryFilter, statusFilter, search, today, catalog]);

  /*
   * Hidden types are only offered
   * while some bill still uses them.
   */
  const filterCategories = useMemo(() => {
    const used = new Set(bills.map((bill) => bill.category));

    return catalog.all.filter(
      (category) => !catalog.isHidden(category) || used.has(category),
    );
  }, [bills, catalog]);

  const totals = useMemo(() => {
    let total = 0;
    let paid = 0;
    let unpaid = 0;

    for (const bill of filteredBills) {
      const amount = Number(bill.amount || 0);

      total += amount;

      if (bill.status === "paid") {
        paid += amount;
      } else {
        unpaid += amount;
      }
    }

    return { total, paid, unpaid };
  }, [filteredBills]);

  function selectPeriod(newPeriod: Exclude<Period, "custom">) {
    setPeriod(newPeriod);

    if (newPeriod === "this-month") {
      setDateRange(getMonthRange());
    } else if (newPeriod === "last-month") {
      setDateRange(getMonthRange(-1));
    } else {
      setDateRange({ from: "", to: "" });
    }
  }

  function handleDateChange(field: keyof DateRange, value: string) {
    setPeriod("custom");
    setDateRange((current) => ({ ...current, [field]: value }));
  }

  /*
   * Resets back to the default view:
   * current month, no other filters.
   */
  function clearFilters() {
    setCategoryFilter("all");
    setStatusFilter("all");
    setSearch("");
    selectPeriod("this-month");
  }

  function handleDownload() {
    if (filteredBills.length === 0) {
      return;
    }

    downloadBillsAsCsv(filteredBills, dateRange, catalog);
  }

  const hasFilters =
    period !== "this-month" ||
    categoryFilter !== "all" ||
    statusFilter !== "all" ||
    search.trim() !== "";

  const periodLabel = getPeriodLabel(period, dateRange);

  if (bills.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">{emptyIcon}</div>

        <h3>{emptyTitle}</h3>

        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bill-table-wrapper">
      {/* =================================
          DATE FILTER
      ================================== */}
      <div className="bill-date-filter">
        <div className="bill-period-tabs" role="group" aria-label="Period">
          <button
            type="button"
            className={period === "this-month" ? "active" : ""}
            onClick={() => selectPeriod("this-month")}>
            This month
          </button>

          <button
            type="button"
            className={period === "last-month" ? "active" : ""}
            onClick={() => selectPeriod("last-month")}>
            Last month
          </button>

          <button
            type="button"
            className={period === "all" ? "active" : ""}
            onClick={() => selectPeriod("all")}>
            All time
          </button>
        </div>

        <div className="bill-date-range">
          <label>
            <span>From</span>

            <input
              type="date"
              value={dateRange.from}
              max={dateRange.to || undefined}
              onChange={(event) => handleDateChange("from", event.target.value)}
            />
          </label>

          <span className="bill-date-separator">→</span>

          <label>
            <span>To</span>

            <input
              type="date"
              value={dateRange.to}
              min={dateRange.from || undefined}
              onChange={(event) => handleDateChange("to", event.target.value)}
            />
          </label>
        </div>
      </div>

      {/* =================================
          OTHER FILTERS
      ================================== */}
      <div className="bill-filters">
        <div className="bill-search">
          <span className="search-icon">🔍</span>

          <input
            type="text"
            placeholder="Search by category, date or notes..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {!hideCategoryFilter && (
          <div className="bill-filter-select">
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">All Categories</option>

              {filterCategories.map((category) => (
                <option key={category} value={category}>
                  {catalog.getConfig(category).label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="bill-filter-select">
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }>
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        {hasFilters && (
          <button
            type="button"
            className="clear-filters-button"
            onClick={clearFilters}>
            Reset
          </button>
        )}

        <button
          type="button"
          className="download-bills-button"
          onClick={handleDownload}
          disabled={filteredBills.length === 0}
          title="Download the bills shown below as CSV">
          <span className="download-icon">↓</span>
          Download
        </button>
      </div>

      {/* =================================
          PERIOD SUMMARY
      ================================== */}
      <div className="bill-summary">
        <div className="bill-summary-item">
          <span>Bills · {periodLabel}</span>
          <strong>
            {filteredBills.length}
            <small> of {bills.length}</small>
          </strong>
        </div>

        <div className="bill-summary-item">
          <span>Total</span>
          <strong>{formatCurrency(totals.total)}</strong>
        </div>

        <div className="bill-summary-item paid">
          <span>Paid</span>
          <strong>{formatCurrency(totals.paid)}</strong>
        </div>

        <div className="bill-summary-item unpaid">
          <span>Unpaid</span>
          <strong>{formatCurrency(totals.unpaid)}</strong>
        </div>
      </div>

      {filteredBills.length === 0 ? (
        <div className="empty-filter-state">
          <div className="empty-state-icon">🗓️</div>

          <h3>No matching bills for {periodLabel}</h3>

          <p>Try another period or change your filters.</p>

          {period === "all" ? (
            <button
              type="button"
              onClick={() => {
                setCategoryFilter("all");
                setStatusFilter("all");
                setSearch("");
              }}>
              Clear filters
            </button>
          ) : (
            <button type="button" onClick={() => selectPeriod("all")}>
              Show all time
            </button>
          )}
        </div>
      ) : (
        <div className="bill-table-container">
          <table className="bill-table">
            <thead>
              <tr>
                <th>Bill</th>
                <th>Date</th>
                <th>Usage</th>
                <th className="align-right">Amount</th>
                <th>Status</th>
                <th className="align-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredBills.map((bill) => {
                const config = catalog.getConfig(bill.category);

                return (
                  <tr key={bill.id}>
                    <td data-label="Bill">
                      <div className="bill-category-cell">
                        <span className={`bill-category-badge ${bill.category}`}>
                          {config.icon}
                        </span>

                        <div>
                          <span className="category-name">
                            {config.label}

                            {(bill.recurring || bill.recurringSourceId) && (
                              <span
                                className="bill-recurring-tag"
                                title={
                                  bill.recurring
                                    ? "Repeats every month"
                                    : "Added from a monthly bill"
                                }>
                                🔁 Monthly
                              </span>
                            )}
                          </span>

                          {bill.notes && (
                            <span className="bill-notes" title={bill.notes}>
                              {bill.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td data-label="Date">
                      <div>
                        <span className="bill-date">
                          {formatDate(bill.billingDate)}
                        </span>

                        {bill.status === "paid" && bill.paymentDate && (
                          <span className="bill-subtext">
                            Paid {formatDate(bill.paymentDate)}
                          </span>
                        )}

                        {bill.status === "unpaid" && bill.dueDate && (
                          <span
                            className={`bill-subtext ${
                              isOverdue(bill, today) ? "overdue" : ""
                            }`}>
                            Due {formatDate(bill.dueDate)}
                          </span>
                        )}
                      </div>
                    </td>

                    <td data-label="Usage">
                      {bill.consumption !== undefined ? (
                        <div>
                          <span className="bill-usage">
                            {bill.consumption.toLocaleString("en-IN")}{" "}
                            {bill.unit ?? ""}
                          </span>

                          {bill.previousReading !== undefined &&
                            bill.currentReading !== undefined && (
                              <span className="bill-subtext">
                                {bill.previousReading.toLocaleString("en-IN")} →{" "}
                                {bill.currentReading.toLocaleString("en-IN")}
                              </span>
                            )}
                        </div>
                      ) : (
                        <span className="bill-muted">—</span>
                      )}
                    </td>

                    <td data-label="Amount" className="bill-amount align-right">
                      <div>
                        {formatCurrency(Number(bill.amount || 0))}

                        {bill.rate !== undefined && (
                          <span className="bill-subtext">
                            @ ₹{bill.rate}/{bill.unit ?? "unit"}
                          </span>
                        )}
                      </div>
                    </td>

                    <td data-label="Status">
                      {isOverdue(bill, today) ? (
                        <span className="status overdue">Overdue</span>
                      ) : (
                        <span className={`status ${bill.status}`}>
                          {bill.status === "paid" ? "Paid" : "Unpaid"}
                        </span>
                      )}
                    </td>

                    <td data-label="Actions" className="align-right">
                      <div className="bill-actions">
                        <button
                          type="button"
                          className="edit-button"
                          onClick={() => onEdit(bill)}>
                          Edit
                        </button>

                        <button
                          type="button"
                          className="delete-button"
                          onClick={() => {
                            if (bill.id) {
                              onDelete(bill.id);
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
                <td colSpan={3}>
                  Total · {filteredBills.length}{" "}
                  {filteredBills.length === 1 ? "bill" : "bills"}
                </td>

                <td className="bill-amount align-right">
                  {formatCurrency(totals.total)}
                </td>

                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

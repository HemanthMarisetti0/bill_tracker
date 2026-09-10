import { useMemo, useState } from "react";

import type {
  Bill,
  BillCategory,
  BillStatus,
} from "../types/bill";

import "./BillTable.css";

interface BillTableProps {
  bills: Bill[];
  onDelete: (billId: string) => void;
  onEdit: (bill: Bill) => void;
}

const categoryLabels: Record<
  BillCategory,
  string
> = {
  water: "Water",
  electricity: "Electricity",
  gas: "Gas",
  internet: "Internet",
  rent: "Rent",
  maintenance: "Maintenance",
  mobile: "Mobile",
  other: "Other",
};

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

function downloadBillsAsCsv(bills: Bill[]) {
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
    "Notes",
  ];

  const rows = bills.map((bill) => [
    bill.billingDate,
    categoryLabels[bill.category],
    bill.previousReading ?? "",
    bill.currentReading ?? "",
    bill.consumption ?? "",
    bill.unit ?? "",
    bill.rate ?? "",
    Number(bill.amount || 0).toFixed(2),
    bill.status.toUpperCase(),
    bill.paymentDate ?? "",
    bill.notes ?? "",
  ]);

  const csvContent = [
    headers,
    ...rows,
  ]
    .map((row) =>
      row
        .map(escapeCsvValue)
        .join(","),
    )
    .join("\r\n");

  const blob = new Blob(
    [csvContent],
    {
      type: "text/csv;charset=utf-8;",
    },
  );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  const date =
    new Date()
      .toISOString()
      .split("T")[0];

  link.href = url;
  link.download = `bill-tracker-${date}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export default function BillTable({
  bills,
  onDelete,
  onEdit,
}: BillTableProps) {
  const [categoryFilter, setCategoryFilter] =
    useState<BillCategory | "all">("all");

  const [statusFilter, setStatusFilter] =
    useState<BillStatus | "all">("all");

  const [search, setSearch] =
    useState("");

  const filteredBills = useMemo(() => {
    const searchValue =
      search.trim().toLowerCase();

    return bills.filter((bill) => {
      const matchesCategory =
        categoryFilter === "all" ||
        bill.category === categoryFilter;

      const matchesStatus =
        statusFilter === "all" ||
        bill.status === statusFilter;

      const categoryName =
        categoryLabels[
          bill.category
        ].toLowerCase();

      const matchesSearch =
        !searchValue ||
        categoryName.includes(
          searchValue,
        ) ||
        bill.billingDate
          .toLowerCase()
          .includes(searchValue) ||
        bill.notes
          ?.toLowerCase()
          .includes(searchValue);

      return (
        matchesCategory &&
        matchesStatus &&
        matchesSearch
      );
    });
  }, [
    bills,
    categoryFilter,
    statusFilter,
    search,
  ]);

  function clearFilters() {
    setCategoryFilter("all");
    setStatusFilter("all");
    setSearch("");
  }

  function handleDownload() {
    if (filteredBills.length === 0) {
      return;
    }

    downloadBillsAsCsv(
      filteredBills,
    );
  }

  const hasFilters =
    categoryFilter !== "all" ||
    statusFilter !== "all" ||
    search.trim() !== "";

  if (bills.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          🧾
        </div>

        <h3>No bills yet</h3>

        <p>
          Add your first bill to start
          tracking.
        </p>
      </div>
    );
  }

  return (
    <div className="bill-table-wrapper">
      <div className="bill-filters">
        <div className="bill-search">
          <span className="search-icon">
            🔍
          </span>

          <input
            type="text"
            placeholder="Search bills..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
          />
        </div>

        <div className="bill-filter-select">
          <select
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(
                event.target
                  .value as
                  | BillCategory
                  | "all",
              )
            }
          >
            <option value="all">
              All Categories
            </option>

            {Object.entries(
              categoryLabels,
            ).map(
              ([value, label]) => (
                <option
                  key={value}
                  value={value}
                >
                  {label}
                </option>
              ),
            )}
          </select>
        </div>

        <div className="bill-filter-select">
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target
                  .value as
                  | BillStatus
                  | "all",
              )
            }
          >
            <option value="all">
              All Status
            </option>

            <option value="paid">
              Paid
            </option>

            <option value="unpaid">
              Unpaid
            </option>
          </select>
        </div>

        {hasFilters && (
          <button
            type="button"
            className="clear-filters-button"
            onClick={clearFilters}
          >
            Clear
          </button>
        )}

        <button
          type="button"
          className="download-bills-button"
          onClick={handleDownload}
          disabled={
            filteredBills.length === 0
          }
          title={
            hasFilters
              ? "Download filtered bills"
              : "Download all bills"
          }
        >
          <span className="download-icon">
            ↓
          </span>

          Download
        </button>
      </div>

      <div className="bill-results-info">
        <span>
          Showing{" "}
          <strong>
            {filteredBills.length}
          </strong>{" "}
          of{" "}
          <strong>
            {bills.length}
          </strong>{" "}
          bills
        </span>

        {filteredBills.length > 0 && (
          <span className="download-hint">
            {hasFilters
              ? "Filtered bills ready to download"
              : "All bills ready to download"}
          </span>
        )}
      </div>

      {filteredBills.length === 0 ? (
        <div className="empty-filter-state">
          <div className="empty-state-icon">
            🔍
          </div>

          <h3>
            No matching bills
          </h3>

          <p>
            Try changing your filters
            or search term.
          </p>

          <button
            type="button"
            onClick={clearFilters}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="bill-table-container">
          <table className="bill-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Consumption</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredBills.map(
                (bill) => (
                  <tr key={bill.id}>
                    <td>
                      {bill.billingDate}
                    </td>

                    <td>
                      <span className="category-name">
                        {
                          categoryLabels[
                            bill.category
                          ]
                        }
                      </span>
                    </td>

                    <td>
                      {bill.consumption !==
                      undefined
                        ? `${bill.consumption.toLocaleString()} ${
                            bill.unit ?? ""
                          }`
                        : "-"}
                    </td>

                    <td className="bill-amount">
                      ₹
                      {Number(
                        bill.amount || 0,
                      ).toFixed(2)}
                    </td>

                    <td>
                      <span
                        className={`status ${bill.status}`}
                      >
                        {bill.status.toUpperCase()}
                      </span>
                    </td>

                    <td>
                      <div className="bill-actions">
                        <button
                          type="button"
                          className="edit-button"
                          onClick={() =>
                            onEdit(bill)
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="delete-button"
                          onClick={() => {
                            if (
                              bill.id
                            ) {
                              onDelete(
                                bill.id,
                              );
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

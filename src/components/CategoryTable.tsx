import { useMemo, useState } from "react";

import { useCategories } from "../context/useCategories";

import type { Bill, CategoryId } from "../types/bill";

import "./BillTable.css";
import "./CategoryTable.css";

interface CategoryTableProps {
  bills: Bill[];
  onToggleHidden: (category: CategoryId) => void;
  onDelete: (category: CategoryId) => void;
}

type VisibilityFilter = "all" | "visible" | "hidden";

const filterLabels: Record<VisibilityFilter, string> = {
  all: "All",
  visible: "Shown",
  hidden: "Hidden",
};

export default function CategoryTable({
  bills,
  onToggleHidden,
  onDelete,
}: CategoryTableProps) {
  const catalog = useCategories();

  const [filter, setFilter] = useState<VisibilityFilter>("all");

  const [search, setSearch] = useState("");

  const billCounts = useMemo(() => {
    const counts = new Map<CategoryId, number>();

    for (const bill of bills) {
      counts.set(bill.category, (counts.get(bill.category) ?? 0) + 1);
    }

    return counts;
  }, [bills]);

  const searchValue = search.trim().toLowerCase();

  const rows = catalog.all.filter((category) => {
    const hidden = catalog.isHidden(category);

    const matchesFilter =
      filter === "all" || (filter === "hidden" ? hidden : !hidden);

    const matchesSearch =
      !searchValue ||
      catalog.getConfig(category).label.toLowerCase().includes(searchValue) ||
      catalog.getGroup(category).label.toLowerCase().includes(searchValue);

    return matchesFilter && matchesSearch;
  });

  const hiddenCount = catalog.all.length - catalog.visible.length;

  return (
    <div className="bill-table-wrapper">
      <div className="bill-filters">
        <div className="bill-period-tabs" role="group" aria-label="Show">
          {(Object.keys(filterLabels) as VisibilityFilter[]).map((item) => (
            <button
              key={item}
              type="button"
              className={filter === item ? "active" : ""}
              onClick={() => setFilter(item)}>
              {filterLabels[item]}
              {item === "hidden" && hiddenCount > 0 && ` (${hiddenCount})`}
            </button>
          ))}
        </div>

        <div className="bill-search">
          <span className="search-icon">🔍</span>

          <input
            type="text"
            placeholder="Search types or groups..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty-filter-state">
          <div className="empty-state-icon">🏷️</div>

          <h3>No matching types</h3>

          <p>Try another search or filter.</p>
        </div>
      ) : (
        <div className="bill-table-container">
          <table className="bill-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Group</th>
                <th>Bills</th>
                <th>Status</th>
                <th className="align-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((category) => {
                const config = catalog.getConfig(category);

                const group = catalog.getGroup(category);

                const hidden = catalog.isHidden(category);

                const custom = catalog.isCustom(category);

                const count = billCounts.get(category) ?? 0;

                return (
                  <tr
                    key={category}
                    className={hidden ? "category-row-hidden" : ""}>
                    <td data-label="Type">
                      <div className="bill-category-cell">
                        <span className={`bill-category-badge ${category}`}>
                          {config.icon}
                        </span>

                        <div>
                          <span className="category-name">
                            {config.label}

                            {custom && (
                              <span className="category-custom-tag">Custom</span>
                            )}
                          </span>

                          {config.meterBased && (
                            <span className="bill-subtext">
                              Meter reading · {config.unit}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td data-label="Group">
                      {group.icon} {group.label}
                    </td>

                    <td data-label="Bills">
                      {count > 0 ? count : <span className="bill-muted">—</span>}
                    </td>

                    <td data-label="Status">
                      <span className={`status ${hidden ? "hidden" : "shown"}`}>
                        {hidden ? "Hidden" : "Shown"}
                      </span>
                    </td>

                    <td data-label="Actions" className="align-right">
                      <div className="bill-actions">
                        <button
                          type="button"
                          className="edit-button"
                          onClick={() => onToggleHidden(category)}
                          title={
                            hidden
                              ? "Show this type when adding bills"
                              : "Hide this type when adding bills"
                          }>
                          {hidden ? "Show" : "Hide"}
                        </button>

                        {custom && (
                          <button
                            type="button"
                            className="delete-button"
                            onClick={() => onDelete(category)}>
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

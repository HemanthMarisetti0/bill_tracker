import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";

import { useCategories } from "../context/useCategories";

import type { Budgets, CategoryId } from "../types/bill";

import "./BillForm.css";

interface BudgetSettingsDialogProps {
  open: boolean;
  budgets: Budgets;
  onClose: () => void;
  onSave: (budgets: Budgets) => Promise<void>;
}

type BudgetInputs = Partial<Record<CategoryId, string>>;

function toInputs(budgets: Budgets, categories: CategoryId[]): BudgetInputs {
  const inputs: BudgetInputs = {};

  for (const category of categories) {
    inputs[category] = budgets[category]?.toString() ?? "";
  }

  return inputs;
}

export default function BudgetSettingsDialog({
  open,
  budgets,
  onClose,
  onSave,
}: BudgetSettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const catalog = useCategories();

  /*
   * Hidden types keep any budget
   * they had, but aren't listed.
   */
  const categories = catalog.all.filter(
    (category) => !catalog.isHidden(category) || budgets[category],
  );

  const [inputs, setInputs] = useState<BudgetInputs>(() =>
    toInputs(budgets, categories),
  );

  const [saving, setSaving] = useState(false);

  /*
   * Open / close native dialog.
   */
  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function handleDialogClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) {
      onClose();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const newBudgets: Budgets = {};

    for (const category of categories) {
      const input = (inputs[category] ?? "").trim();

      /*
       * Empty means no budget for
       * this category.
       */
      if (input === "") {
        continue;
      }

      const value = Number(input);

      if (!Number.isFinite(value) || value < 0) {
        alert(
          `Please enter a valid ${catalog.getConfig(category).label.toLowerCase()} budget.`,
        );

        return;
      }

      newBudgets[category] = value;
    }

    try {
      setSaving(true);

      await onSave(newBudgets);
    } catch (error) {
      console.error("Failed to save budgets:", error);

      const message = error instanceof Error ? error.message : String(error);

      alert(`Failed to save budgets.

${message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="bill-dialog"
      onClick={handleDialogClick}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}>
      <div className="bill-dialog-content">
        <header className="bill-dialog-header">
          <div className="bill-dialog-heading">
            <div className="bill-dialog-main-icon">🎯</div>

            <div>
              <h2>Monthly Budgets</h2>

              <p>
                Set a monthly limit for any category. You'll see a warning at
                80% and when you go over. Leave blank for no budget.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="bill-dialog-close"
            onClick={onClose}
            aria-label="Close">
            ×
          </button>
        </header>

        <form className="bill-form" onSubmit={handleSubmit}>
          <section className="bill-form-section">
            <div className="bill-form-grid">
              {categories.map((category) => {
                const config = catalog.getConfig(category);

                return (
                  <label key={category} className="bill-field">
                    <span>
                      {config.icon} {config.label}
                    </span>

                    <div className="bill-input-unit">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={inputs[category] ?? ""}
                        onChange={(event) =>
                          setInputs((current) => ({
                            ...current,
                            [category]: event.target.value,
                          }))
                        }
                        placeholder="No budget"
                      />

                      <span>₹ / month</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          <div className="bill-dialog-actions">
            <button
              type="button"
              className="bill-cancel-button"
              onClick={onClose}
              disabled={saving}>
              Cancel
            </button>

            <button
              type="submit"
              className="bill-save-button"
              disabled={saving}>
              {saving ? (
                <>
                  <span className="bill-spinner" />
                  Saving...
                </>
              ) : (
                "Save Budgets"
              )}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

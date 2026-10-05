import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";

import { getToday } from "../lib/dates";
import { incomeSourceConfig, incomeSources } from "../lib/income";

import type { Income, IncomeSource } from "../types/bill";

import "./BillForm.css";

interface IncomeFormProps {
  open: boolean;
  editingIncome?: Income | null;
  onClose: () => void;
  onSave: (income: Omit<Income, "id" | "createdAt">) => Promise<void>;
}

export default function IncomeForm({
  open,
  editingIncome = null,
  onClose,
  onSave,
}: IncomeFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [source, setSource] = useState<IncomeSource>(
    editingIncome?.source ?? "salary",
  );

  const [amount, setAmount] = useState(editingIncome?.amount.toString() ?? "");

  const [date, setDate] = useState(editingIncome?.date ?? getToday());

  const [notes, setNotes] = useState(editingIncome?.notes ?? "");

  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(editingIncome);

  const config = incomeSourceConfig[source];

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

    const value = Number(amount);

    if (!amount.trim() || !Number.isFinite(value) || value <= 0) {
      alert("Please enter a valid amount.");

      return;
    }

    if (!date) {
      alert("Please select the date you received it.");

      return;
    }

    try {
      setSaving(true);

      await onSave({
        source,
        amount: value,
        date,
        notes: notes.trim() || undefined,
      });
    } catch (error) {
      console.error("Failed to save income:", error);

      const message = error instanceof Error ? error.message : String(error);

      alert(`Failed to save income.

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
            <div className="bill-dialog-main-icon">{config.icon}</div>

            <div>
              <h2>{isEditing ? "Edit Income" : "Add Income"}</h2>

              <p>
                Record your salary or other money coming in, so you can see
                what's left after bills.
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
              <label className="bill-field">
                <span>Source</span>

                <select
                  value={source}
                  onChange={(event) =>
                    setSource(event.target.value as IncomeSource)
                  }>
                  {incomeSources.map((item) => (
                    <option key={item} value={item}>
                      {incomeSourceConfig[item].icon}{" "}
                      {incomeSourceConfig[item].label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="bill-field">
                <span>Amount</span>

                <div className="bill-input-unit">
                  <span>₹</span>

                  <input
                    className="bill-amount-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="Enter amount"
                    required
                    autoFocus
                  />
                </div>
              </label>

              <label className="bill-field">
                <span>Received On</span>

                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  required
                />
              </label>
            </div>
          </section>

          <section className="bill-form-section">
            <div className="bill-form-section-title">Notes</div>

            <label className="bill-field">
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="e.g. October salary, Diwali bonus..."
                rows={3}
              />
            </label>
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
              ) : isEditing ? (
                "Update Income"
              ) : (
                "Save Income"
              )}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

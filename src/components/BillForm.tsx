import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";

import { collection, getDocs, orderBy, query } from "firebase/firestore";

import { db } from "../lib/firestore";
import { useAuth } from "../context/useAuth";

import {
  calculateAmount,
  calculateConsumption,
} from "../services/billCalculator";
import { getMeterSetting } from "../services/meterSettingsService";
import {
  categoryConfig,
  categoryGroups,
  getCategoryGroup,
  isMeterCategory,
  meterCategories,
} from "../lib/categories";
import { getToday } from "../lib/dates";

import type {
  Bill,
  BillCategory,
  BillStatus,
  MeterSettings,
} from "../types/bill";

import ChevronIcon from "./ChevronIcon";

import "./BillForm.css";

interface BillFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (bill: Omit<Bill, "id" | "createdAt">) => Promise<void>;
  editingBill?: Bill | null;
  meterSettings: MeterSettings;
  onCustomizeMeters: () => void;
}

function getInitialCategory(editingBill?: Bill | null): BillCategory {
  return editingBill?.category ?? "water";
}

function getInitialBillingDate(editingBill?: Bill | null): string {
  return editingBill?.billingDate ?? getToday();
}

function getInitialCurrentReading(editingBill?: Bill | null): string {
  return editingBill?.currentReading?.toString() ?? "";
}

/*
 * null means "use the rate
 * from meter settings".
 */
function getInitialRate(editingBill?: Bill | null): string | null {
  return editingBill?.rate?.toString() ?? null;
}

/*
 * A meter bill saved without readings
 * was entered as a direct amount.
 */
function getInitialNoReading(editingBill?: Bill | null): boolean {
  return Boolean(
    editingBill &&
      meterCategories.includes(editingBill.category) &&
      editingBill.currentReading === undefined,
  );
}

function getInitialAmount(editingBill?: Bill | null): string {
  if (
    !editingBill ||
    (meterCategories.includes(editingBill.category) &&
      !getInitialNoReading(editingBill))
  ) {
    return "";
  }

  return editingBill.amount.toString();
}

function getInitialStatus(editingBill?: Bill | null): BillStatus {
  return editingBill?.status ?? "paid";
}

function getInitialPaymentDate(editingBill?: Bill | null): string {
  return editingBill?.paymentDate ?? getToday();
}

function getInitialNotes(editingBill?: Bill | null): string {
  return editingBill?.notes ?? "";
}

function getInitialDueDate(editingBill?: Bill | null): string {
  return editingBill?.dueDate ?? "";
}

function getInitialRecurring(editingBill?: Bill | null): boolean {
  return editingBill?.recurring ?? false;
}

export default function BillForm({
  open,
  onClose,
  onSave,
  editingBill = null,
  meterSettings,
  onCustomizeMeters,
}: BillFormProps) {
  const { user } = useAuth();

  const dialogRef = useRef<HTMLDialogElement>(null);

  const [category, setCategory] = useState<BillCategory>(
    getInitialCategory(editingBill),
  );

  /*
   * Category group expanded in the picker.
   * Starts on the selected category's group.
   */
  const [openGroup, setOpenGroup] = useState<string | null>(
    () => getCategoryGroup(getInitialCategory(editingBill)).label,
  );

  const [billingDate, setBillingDate] = useState<string>(
    getInitialBillingDate(editingBill),
  );

  /*
   * Current reading of the latest bill
   * for the selected category, or null
   * if there are no bills yet.
   */
  const [latestReading, setLatestReading] = useState<number | null>(null);

  const [currentReading, setCurrentReading] = useState<string>(
    getInitialCurrentReading(editingBill),
  );

  const [noReading, setNoReading] = useState<boolean>(
    getInitialNoReading(editingBill),
  );

  const [rateInput, setRateInput] = useState<string | null>(
    getInitialRate(editingBill),
  );

  const [amountInput, setAmountInput] = useState<string>(
    getInitialAmount(editingBill),
  );

  const [status, setStatus] = useState<BillStatus>(
    getInitialStatus(editingBill),
  );

  const [paymentDate, setPaymentDate] = useState<string>(
    getInitialPaymentDate(editingBill),
  );

  const [notes, setNotes] = useState<string>(getInitialNotes(editingBill));

  const [dueDate, setDueDate] = useState<string>(
    getInitialDueDate(editingBill),
  );

  const [recurring, setRecurring] = useState<boolean>(
    getInitialRecurring(editingBill),
  );

  const [saving, setSaving] = useState(false);

  const [loadingPreviousReading, setLoadingPreviousReading] = useState(false);

  const isEditing = Boolean(editingBill);

  const config = categoryConfig[category];

  const isMeterBased = config.meterBased;

  /*
   * Meter bills can skip readings and
   * take the amount directly.
   */
  const usesReadings = isMeterBased && !noReading;

  /*
   * Meter bills need a new reading each
   * month, and a copy made from a recurring
   * bill can't start its own series.
   */
  const canRecur = !isMeterBased && !editingBill?.recurringSourceId;

  const meterSetting = isMeterCategory(category)
    ? getMeterSetting(meterSettings, category)
    : {};

  const previousReading = isEditing
    ? (editingBill?.previousReading ?? 0)
    : (latestReading ?? meterSetting.initialReading ?? 0);

  const rate = rateInput ?? meterSetting.rate?.toString() ?? "";

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

  /*
   * Load the latest meter reading
   * from the current user's bills.
   *
   * Firestore path:
   *
   * users/{user.uid}/bills
   */
  useEffect(() => {
    if (!open || !user || !usesReadings || isEditing) {
      return;
    }

    let cancelled = false;

    async function loadPreviousReading() {
      try {
        setLoadingPreviousReading(true);

        const billsCollection = collection(
          db,
          "users",
          user?.uid ?? "",
          "bills",
        );

        const billsQuery = query(
          billsCollection,
          orderBy("billingDate", "desc"),
        );

        const snapshot = await getDocs(billsQuery);

        if (cancelled) {
          return;
        }

        const bills = snapshot.docs.map(
          (document) =>
            ({
              id: document.id,
              ...document.data(),
            }) as Bill,
        );

        /*
         * Only look at bills for the
         * currently selected category.
         */
        const categoryBills = bills.filter(
          (bill) => bill.category === category,
        );

        /*
         * With no earlier bills, the initial
         * reading from meter settings is used.
         */
        setLatestReading(
          categoryBills.find((bill) => bill.currentReading !== undefined)
            ?.currentReading ?? null,
        );
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load previous reading:", error);

          setLatestReading(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingPreviousReading(false);
        }
      }
    }

    void loadPreviousReading();

    return () => {
      cancelled = true;
    };
  }, [open, user, category, usesReadings, isEditing]);

  /*
   * Consumption calculation.
   */
  const consumption = useMemo(() => {
    if (!usesReadings) {
      return 0;
    }

    const current = Number(currentReading);

    if (!Number.isFinite(current) || current < previousReading) {
      return 0;
    }

    return calculateConsumption(previousReading, current);
  }, [currentReading, previousReading, usesReadings]);

  /*
   * Amount calculation for
   * meter-based bills.
   */
  const calculatedAmount = useMemo(() => {
    if (!usesReadings) {
      return 0;
    }

    const rateValue = Number(rate);

    if (!Number.isFinite(rateValue) || rateValue < 0) {
      return 0;
    }

    return calculateAmount(consumption, rateValue);
  }, [consumption, rate, usesReadings]);

  const finalAmount = usesReadings ? calculatedAmount : Number(amountInput);

  /*
   * Category change.
   */
  function handleCategoryChange(newCategory: BillCategory) {
    setCategory(newCategory);

    setCurrentReading("");
    setAmountInput("");
    setRateInput(null);
    setLatestReading(null);
  }

  /*
   * Dialog backdrop click.
   */
  function handleDialogClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) {
      onClose();
    }
  }

  /*
   * Submit.
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      alert("You must be logged in to save a bill.");

      return;
    }

    if (!billingDate) {
      alert("Please select a billing date.");

      return;
    }

    /*
     * Meter validation.
     */
    if (usesReadings) {
      const current = Number(currentReading);

      const rateValue = Number(rate);

      if (!Number.isFinite(current)) {
        alert("Please enter a valid current reading.");

        return;
      }

      if (current < previousReading) {
        alert("Current reading cannot be lower than previous reading.");

        return;
      }

      if (!Number.isFinite(rateValue) || rateValue < 0) {
        alert("Please enter a valid rate.");

        return;
      }
    }

    /*
     * Direct amount validation.
     */
    if (!usesReadings) {
      if (!Number.isFinite(finalAmount) || finalAmount < 0) {
        alert("Please enter a valid bill amount.");

        return;
      }
    }

    /*
     * Payment validation.
     */
    if (status === "paid" && !paymentDate) {
      alert("Please select the payment date.");

      return;
    }

    try {
      setSaving(true);

      const billData: Omit<Bill, "id" | "createdAt"> = {
        category,
        billingDate,

        ...(usesReadings
          ? {
              previousReading,
              currentReading: Number(currentReading),
              consumption,
              unit: config.unit,
              rate: Number(rate),
            }
          : {}),

        amount: Number(finalAmount),

        status,

        paymentDate: status === "paid" ? paymentDate : undefined,

        dueDate: dueDate || undefined,

        notes: notes.trim(),

        recurring: canRecur && recurring ? true : undefined,
      };

      /*
       * Dashboard handles add/update
       * through billService.
       */
      await onSave(billData);

      /*
       * Clear fields after
       * successful save.
       */
      setCurrentReading("");
      setAmountInput("");
      setNotes("");
    } catch (error) {
      console.error("Failed to save bill:", error);

      const message = error instanceof Error ? error.message : String(error);

      alert(
        `${isEditing ? "Failed to update bill." : "Failed to save bill."}

${message}`,
      );
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
        {/* =====================================
            HEADER
        ====================================== */}
        <header className="bill-dialog-header">
          <div className="bill-dialog-heading">
            <div className="bill-dialog-main-icon">{config.icon}</div>

            <div>
              <h2>{isEditing ? "Edit Bill" : "Add Bill"}</h2>

              <p>
                {isEditing
                  ? "Update your bill details"
                  : "Add a new bill to your account"}
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

        <div className="bill-dialog-main">
          {/* =====================================
              CATEGORY
          ====================================== */}
          <section className="bill-category-section">
            <div className="bill-form-section-title">Bill Category</div>

            <div className="bill-category-accordion">
              {categoryGroups.map((group) => {
                const isOpen = openGroup === group.label;

                const hasSelected = group.categories.includes(category);

                const panelId = `bill-category-group-${group.label
                  .toLowerCase()
                  .replace(/[^a-z]+/g, "-")}`;

                return (
                  <div
                    key={group.label}
                    className={`bill-category-group ${isOpen ? "open" : ""}`}>
                    <button
                      type="button"
                      className="bill-category-group-header"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() =>
                        setOpenGroup(isOpen ? null : group.label)
                      }>
                      <span className="bill-category-group-icon">
                        {group.icon}
                      </span>

                      <span className="bill-category-group-label">
                        {group.label}
                      </span>

                      {hasSelected && !isOpen && (
                        <span className="bill-category-group-selected">
                          {config.icon} {config.label}
                        </span>
                      )}

                      <span className="bill-category-group-chevron">
                        <ChevronIcon />
                      </span>
                    </button>

                    {isOpen && (
                      <div id={panelId} className="bill-category-grid">
                        {group.categories.map((item) => {
                          const itemConfig = categoryConfig[item];

                          return (
                            <button
                              key={item}
                              type="button"
                              className={`bill-category-card ${
                                category === item ? "selected" : ""
                              }`}
                              onClick={() => handleCategoryChange(item)}>
                              <span className="bill-category-icon">
                                {itemConfig.icon}
                              </span>

                              <span className="bill-category-name">
                                {itemConfig.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bill-selected-info">
              <strong>
                {config.icon} {config.label}
              </strong>

              <span>{config.description}</span>

              {usesReadings && (
                <button
                  type="button"
                  className="bill-customize-button"
                  onClick={onCustomizeMeters}>
                  ⚙️ Customize readings
                </button>
              )}
            </div>
          </section>

          {/* =====================================
              FORM
          ====================================== */}
          <form className="bill-form" onSubmit={handleSubmit}>
            {/* =================================
                BILL DETAILS
            ================================== */}
            <section className="bill-form-section">
              <div className="bill-form-section-title">Bill Details</div>

              <div className="bill-form-grid">
                {/* Billing date */}
                <label className="bill-field">
                  <span>Billing Date</span>

                  <input
                    type="date"
                    value={billingDate}
                    onChange={(event) => setBillingDate(event.target.value)}
                    required
                  />
                </label>

                {usesReadings ? (
                  <>
                    {/* Previous reading */}
                    <label className="bill-field">
                      <span>Previous Reading</span>

                      <div className="bill-input-unit">
                        <input
                          type="number"
                          value={loadingPreviousReading ? "" : previousReading}
                          readOnly
                          disabled
                        />

                        <span>{config.unit}</span>
                      </div>

                      {loadingPreviousReading && (
                        <small>Loading latest reading...</small>
                      )}
                    </label>

                    {/* Current reading */}
                    <label className="bill-field">
                      <span>Current Reading</span>

                      <div className="bill-input-unit">
                        <input
                          type="number"
                          min={previousReading}
                          value={currentReading}
                          onChange={(event) =>
                            setCurrentReading(event.target.value)
                          }
                          placeholder="Enter current reading"
                          required
                        />

                        <span>{config.unit}</span>
                      </div>
                    </label>

                    {/* Rate */}
                    <label className="bill-field">
                      <span>Rate</span>

                      <div className="bill-input-unit">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={rate}
                          onChange={(event) => setRateInput(event.target.value)}
                          placeholder="Enter rate"
                          required
                        />

                        <span>₹ / {config.unit}</span>
                      </div>
                    </label>
                  </>
                ) : (
                  /* Direct bill amount */
                  <label className="bill-field">
                    <span>Bill Amount</span>

                    <div className="bill-input-unit">
                      <span>₹</span>

                      <input
                        className="bill-amount-input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={amountInput}
                        onChange={(event) => setAmountInput(event.target.value)}
                        placeholder="Enter amount"
                        required
                      />
                    </div>
                  </label>
                )}
              </div>

              {isMeterBased && (
                <label className="bill-recurring-field">
                  <input
                    type="checkbox"
                    checked={noReading}
                    onChange={(event) => setNoReading(event.target.checked)}
                  />

                  <span>
                    <strong>No reading</strong>

                    <small>
                      Enter the bill amount directly instead of meter readings.
                    </small>
                  </span>
                </label>
              )}
            </section>

            {/* =================================
                CALCULATION
            ================================== */}
            {usesReadings && (
              <section className="bill-calculation">
                <div className="bill-form-section-title">Calculation</div>

                <div className="bill-calculation-grid">
                  <div className="bill-calc-item">
                    <span>Previous</span>

                    <strong>
                      {previousReading.toLocaleString()} {config.unit}
                    </strong>
                  </div>

                  <div className="bill-calc-item">
                    <span>Current</span>

                    <strong>
                      {Number(currentReading || 0).toLocaleString()}{" "}
                      {config.unit}
                    </strong>
                  </div>

                  <div className="bill-calc-item">
                    <span>Consumption</span>

                    <strong>
                      {consumption.toLocaleString()} {config.unit}
                    </strong>
                  </div>

                  <div className="bill-calc-item bill-calc-total">
                    <span>Total Amount</span>

                    <strong>₹{calculatedAmount.toFixed(2)}</strong>
                  </div>
                </div>
              </section>
            )}

            {/* =================================
                PAYMENT
            ================================== */}
            <section className="bill-form-section">
              <div className="bill-form-section-title">Payment</div>

              <div className="bill-form-grid">
                <label className="bill-field">
                  <span>Payment Status</span>

                  <select
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as BillStatus)
                    }>
                    <option value="paid">Paid</option>

                    <option value="unpaid">Unpaid</option>
                  </select>
                </label>

                {status === "paid" && (
                  <label className="bill-field">
                    <span>Payment Date</span>

                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(event) => setPaymentDate(event.target.value)}
                      required
                    />
                  </label>
                )}

                <label className="bill-field">
                  <span>Due Date (optional)</span>

                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                  />

                  <small>Unpaid bills past this date are marked overdue.</small>
                </label>
              </div>

              {canRecur && (
                <label className="bill-recurring-field">
                  <input
                    type="checkbox"
                    checked={recurring}
                    onChange={(event) => setRecurring(event.target.checked)}
                  />

                  <span>
                    <strong>🔁 Repeat every month</strong>

                    <small>
                      An unpaid copy of this bill is added at the start of each
                      month. Untick to stop.
                    </small>
                  </span>
                </label>
              )}
            </section>

            {/* =================================
                NOTES
            ================================== */}
            <section className="bill-form-section">
              <div className="bill-form-section-title">Notes</div>

              <label className="bill-field">
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Add any notes about this bill..."
                  rows={4}
                />
              </label>
            </section>

            {/* =================================
                ACTIONS
            ================================== */}
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

                    {isEditing ? "Updating..." : "Saving..."}
                  </>
                ) : isEditing ? (
                  "Update Bill"
                ) : (
                  "Save Bill"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </dialog>
  );
}

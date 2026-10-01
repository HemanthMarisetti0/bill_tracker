import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";

import { collection, getDocs, orderBy, query } from "firebase/firestore";

import { db } from "../lib/firebase";
import { useAuth } from "../context/useAuth";

import {
  calculateAmount,
  calculateConsumption,
} from "../services/billCalculator";
import { getMeterSetting } from "../services/meterSettingsService";

import type {
  Bill,
  BillCategory,
  BillStatus,
  MeterCategory,
  MeterSettings,
} from "../types/bill";

import "./BillForm.css";

interface BillFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (bill: Omit<Bill, "id" | "createdAt">) => Promise<void>;
  editingBill?: Bill | null;
  meterSettings: MeterSettings;
  onCustomizeMeters: () => void;
}

interface CategoryConfig {
  label: string;
  icon: string;
  description: string;
  meterBased: boolean;
  unit?: string;
}

const categoryConfig: Record<BillCategory, CategoryConfig> = {
  water: {
    label: "Water",
    icon: "💧",
    description: "Track your water meter usage",
    meterBased: true,
    unit: "litre",
  },

  electricity: {
    label: "Electricity",
    icon: "⚡",
    description: "Track your electricity consumption",
    meterBased: true,
    unit: "kWh",
  },

  gas: {
    label: "Gas",
    icon: "🔥",
    description: "Track your gas consumption",
    meterBased: true,
    unit: "unit",
  },

  internet: {
    label: "Internet",
    icon: "🌐",
    description: "Track your internet bill",
    meterBased: false,
  },

  rent: {
    label: "Rent",
    icon: "🏠",
    description: "Track your monthly rent",
    meterBased: false,
  },

  maintenance: {
    label: "Maintenance",
    icon: "🛠️",
    description: "Track maintenance charges",
    meterBased: false,
  },

  mobile: {
    label: "Mobile",
    icon: "📱",
    description: "Track your mobile bill",
    meterBased: false,
  },

  food: {
    label: "Food",
    icon: "🍔",
    description: "Track food and dining expenses",
    meterBased: false,
  },

  travel: {
    label: "Travel",
    icon: "✈️",
    description: "Track travel expenses",
    meterBased: false,
  },

  other: {
    label: "Other",
    icon: "🧾",
    description: "Track any other bill",
    meterBased: false,
  },
};

const categories: BillCategory[] = [
  "water",
  "electricity",
  "gas",
  "internet",
  "rent",
  "maintenance",
  "mobile",
  "food",
  "travel",
  "other",
];

const meterCategories: BillCategory[] = ["water", "electricity", "gas"];

function isMeterCategory(category: BillCategory): category is MeterCategory {
  return meterCategories.includes(category);
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
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

function getInitialAmount(editingBill?: Bill | null): string {
  if (!editingBill || meterCategories.includes(editingBill.category)) {
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

  const [saving, setSaving] = useState(false);

  const [loadingPreviousReading, setLoadingPreviousReading] = useState(false);

  const isEditing = Boolean(editingBill);

  const config = categoryConfig[category];

  const isMeterBased = config.meterBased;

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
    if (!open || !user || !isMeterBased || isEditing) {
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
        setLatestReading(categoryBills[0]?.currentReading ?? null);
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
  }, [open, user, category, isMeterBased, isEditing]);

  /*
   * Consumption calculation.
   */
  const consumption = useMemo(() => {
    if (!isMeterBased) {
      return 0;
    }

    const current = Number(currentReading);

    if (!Number.isFinite(current) || current < previousReading) {
      return 0;
    }

    return calculateConsumption(previousReading, current);
  }, [currentReading, previousReading, isMeterBased]);

  /*
   * Amount calculation for
   * meter-based bills.
   */
  const calculatedAmount = useMemo(() => {
    if (!isMeterBased) {
      return 0;
    }

    const rateValue = Number(rate);

    if (!Number.isFinite(rateValue) || rateValue < 0) {
      return 0;
    }

    return calculateAmount(consumption, rateValue);
  }, [consumption, rate, isMeterBased]);

  const finalAmount = isMeterBased ? calculatedAmount : Number(amountInput);

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
    if (isMeterBased) {
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
    if (!isMeterBased) {
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

        ...(isMeterBased
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

        notes: notes.trim(),
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

            <div className="bill-category-grid">
              {categories.map((item) => {
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

            <div className="bill-selected-info">
              <strong>
                {config.icon} {config.label}
              </strong>

              <span>{config.description}</span>

              {isMeterBased && (
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

                {isMeterBased ? (
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
            </section>

            {/* =================================
                CALCULATION
            ================================== */}
            {isMeterBased && (
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
              </div>
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

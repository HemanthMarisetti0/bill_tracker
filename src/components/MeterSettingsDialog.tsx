import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";

import { getMeterSetting } from "../services/meterSettingsService";

import type { MeterCategory, MeterSetting, MeterSettings } from "../types/bill";

import "./BillForm.css";

interface MeterSettingsDialogProps {
  open: boolean;
  settings: MeterSettings;
  onClose: () => void;
  onSave: (settings: MeterSettings) => Promise<void>;
}

interface MeterFieldConfig {
  label: string;
  icon: string;
  unit: string;
}

const meterFields: Record<MeterCategory, MeterFieldConfig> = {
  water: { label: "Water", icon: "💧", unit: "litre" },
  electricity: { label: "Electricity", icon: "⚡", unit: "kWh" },
  gas: { label: "Gas", icon: "🔥", unit: "unit" },
};

const meterCategories: MeterCategory[] = ["water", "electricity", "gas"];

type MeterInputs = Record<MeterCategory, { initialReading: string; rate: string }>;

function toInputs(settings: MeterSettings): MeterInputs {
  const inputs = {} as MeterInputs;

  for (const category of meterCategories) {
    const setting = getMeterSetting(settings, category);

    inputs[category] = {
      initialReading: setting.initialReading?.toString() ?? "",
      rate: setting.rate?.toString() ?? "",
    };
  }

  return inputs;
}

export default function MeterSettingsDialog({
  open,
  settings,
  onClose,
  onSave,
}: MeterSettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [inputs, setInputs] = useState<MeterInputs>(() => toInputs(settings));

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

  function handleChange(
    category: MeterCategory,
    field: "initialReading" | "rate",
    value: string,
  ) {
    setInputs((current) => ({
      ...current,
      [category]: { ...current[category], [field]: value },
    }));
  }

  function handleDialogClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) {
      onClose();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const newSettings: MeterSettings = {};

    for (const category of meterCategories) {
      const { initialReading, rate } = inputs[category];

      const setting: MeterSetting = {};

      /*
       * Firestore rejects undefined values,
       * so only set fields that were filled in.
       */
      if (initialReading.trim() !== "") {
        const value = Number(initialReading);

        if (!Number.isFinite(value) || value < 0) {
          alert(`Please enter a valid ${meterFields[category].label.toLowerCase()} initial reading.`);

          return;
        }

        setting.initialReading = value;
      }

      if (rate.trim() !== "") {
        const value = Number(rate);

        if (!Number.isFinite(value) || value < 0) {
          alert(`Please enter a valid ${meterFields[category].label.toLowerCase()} rate.`);

          return;
        }

        setting.rate = value;
      }

      newSettings[category] = setting;
    }

    try {
      setSaving(true);

      await onSave(newSettings);
    } catch (error) {
      console.error("Failed to save meter settings:", error);

      const message = error instanceof Error ? error.message : String(error);

      alert(`Failed to save meter settings.

${message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="bill-dialog meter-settings-dialog"
      onClick={handleDialogClick}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}>
      <div className="bill-dialog-content">
        <header className="bill-dialog-header">
          <div className="bill-dialog-heading">
            <div className="bill-dialog-main-icon">⚙️</div>

            <div>
              <h2>Meter Settings</h2>

              <p>
                The initial reading is used as the previous reading for your
                first bill of each type. The rate is pre-filled on new bills.
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
          {meterCategories.map((category) => {
            const field = meterFields[category];

            return (
              <section key={category} className="bill-form-section">
                <div className="bill-form-section-title">
                  {field.icon} {field.label}
                </div>

                <div className="bill-form-grid">
                  <label className="bill-field">
                    <span>Initial Reading</span>

                    <div className="bill-input-unit">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={inputs[category].initialReading}
                        onChange={(event) =>
                          handleChange(category, "initialReading", event.target.value)
                        }
                        placeholder="Enter initial reading"
                      />

                      <span>{field.unit}</span>
                    </div>
                  </label>

                  <label className="bill-field">
                    <span>Rate</span>

                    <div className="bill-input-unit">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={inputs[category].rate}
                        onChange={(event) =>
                          handleChange(category, "rate", event.target.value)
                        }
                        placeholder="Enter rate"
                      />

                      <span>₹ / {field.unit}</span>
                    </div>
                  </label>
                </div>
              </section>
            );
          })}

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
                "Save Settings"
              )}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

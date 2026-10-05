import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";

import { useCategories } from "../context/useCategories";

import type { CustomCategory } from "../types/bill";

import "./BillForm.css";
import "./CategoryTable.css";

const MAX_LABEL_LENGTH = 30;

/*
 * Quick picks; any emoji
 * can be typed instead.
 */
const suggestedIcons = [
  "🏷️", "📦", "🎮", "📚", "🍕", "☕", "🚕", "🎵",
  "🧴", "🛠️", "🏥", "🎨", "⚽", "👶", "🌱", "🍺",
];

interface CategoryFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (category: Omit<CustomCategory, "id">) => Promise<void>;
}

export default function CategoryForm({
  open,
  onClose,
  onSave,
}: CategoryFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const catalog = useCategories();

  const [label, setLabel] = useState("");

  const [icon, setIcon] = useState(suggestedIcons[0]);

  const [group, setGroup] = useState(
    catalog.groups[catalog.groups.length - 1].label,
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

    const trimmed = label.trim();

    if (!trimmed) {
      alert("Please enter a name for the type.");

      return;
    }

    const taken = catalog.all.some(
      (category) =>
        catalog.getConfig(category).label.toLowerCase() ===
        trimmed.toLowerCase(),
    );

    if (taken) {
      alert(`A type called "${trimmed}" already exists.`);

      return;
    }

    try {
      setSaving(true);

      await onSave({
        label: trimmed,
        icon: icon.trim() || suggestedIcons[0],
        group,
      });
    } catch (error) {
      console.error("Failed to add type:", error);

      const message = error instanceof Error ? error.message : String(error);

      alert(`Failed to add type.

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
            <div className="bill-dialog-main-icon">{icon || "🏷️"}</div>

            <div>
              <h2>Add Type</h2>

              <p>Create your own bill type to pick when adding bills.</p>
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
                <span>Name</span>

                <input
                  type="text"
                  value={label}
                  maxLength={MAX_LABEL_LENGTH}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="e.g. Books"
                  required
                  autoFocus
                />
              </label>

              <label className="bill-field">
                <span>Group</span>

                <select
                  value={group}
                  onChange={(event) => setGroup(event.target.value)}>
                  {catalog.groups.map((item) => (
                    <option key={item.label} value={item.label}>
                      {item.icon} {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="bill-field">
                <span>Icon</span>

                <input
                  type="text"
                  value={icon}
                  maxLength={8}
                  onChange={(event) => setIcon(event.target.value)}
                  placeholder="Type or pick an emoji"
                />
              </label>
            </div>

            <div className="type-icon-picker" role="group" aria-label="Icons">
              {suggestedIcons.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={icon === item ? "selected" : ""}
                  onClick={() => setIcon(item)}
                  aria-label={`Use ${item}`}>
                  {item}
                </button>
              ))}
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
                "Add Type"
              )}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";

import type { Profile } from "../types/bill";

import "./BillForm.css";

const MAX_NAME_LENGTH = 30;

interface ProfileSettingsDialogProps {
  open: boolean;
  profile: Profile;
  /*
   * Shown as the placeholder so the user
   * knows what's used when left blank.
   */
  defaultName: string;
  onClose: () => void;
  onSave: (profile: Profile) => Promise<void>;
}

export default function ProfileSettingsDialog({
  open,
  profile,
  defaultName,
  onClose,
  onSave,
}: ProfileSettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [preferredName, setPreferredName] = useState(
    profile.preferredName ?? "",
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

    const trimmed = preferredName.trim();

    /*
     * Empty means fall back to the
     * account name.
     */
    const newProfile: Profile = trimmed ? { preferredName: trimmed } : {};

    try {
      setSaving(true);

      await onSave(newProfile);
    } catch (error) {
      console.error("Failed to save profile:", error);

      const message = error instanceof Error ? error.message : String(error);

      alert(`Failed to save profile.

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
            <div className="bill-dialog-main-icon">👋</div>

            <div>
              <h2>Your Profile</h2>

              <p>
                Choose what Bill Tracker should call you. Leave blank to use
                your account name.
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
            <label className="bill-field">
              <span>Preferred name</span>

              <input
                type="text"
                value={preferredName}
                maxLength={MAX_NAME_LENGTH}
                onChange={(event) => setPreferredName(event.target.value)}
                placeholder={defaultName || "e.g. Sam"}
                autoFocus
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
              ) : (
                "Save Profile"
              )}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

import { useEffect, useRef, useState } from "react";

import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

import { useAuth } from "../context/useAuth";
import { db } from "../lib/firestore";

import { logout } from "../services/authService";
import { addBill, deleteBill, updateBill } from "../services/billService";
import {
  saveMeterSettings,
  subscribeToMeterSettings,
} from "../services/meterSettingsService";
import { saveBudgets, subscribeToBudgets } from "../services/budgetService";
import { saveProfile, subscribeToProfile } from "../services/profileService";
import { generateRecurringBills } from "../services/recurringService";
import { isOverdue } from "../lib/dates";

import BillForm from "../components/BillForm";
import BillTable from "../components/BillTable";
import MeterSettingsDialog from "../components/MeterSettingsDialog";
import BudgetSettingsDialog from "../components/BudgetSettingsDialog";
import ProfileSettingsDialog from "../components/ProfileSettingsDialog";
import MonthlySummary from "../components/MonthlySummary";
import MonthComparison from "../components/MonthComparison";
import Loader from "../components/Loader";
import ThemeToggle from "../components/ThemeToggle";
import Credits from "../components/Credits";

import type { Bill, Budgets, MeterSettings, Profile } from "../types/bill";

import "./Dashboard.css";

export default function Dashboard() {
  const { user } = useAuth();

  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  const [showBillForm, setShowBillForm] = useState(false);

  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  /*
   * Changing this key forces BillForm to remount.
   * This is useful when switching between
   * Add and Edit modes.
   */
  const [formKey, setFormKey] = useState(0);

  const [meterSettings, setMeterSettings] = useState<MeterSettings>({});

  const [showMeterSettings, setShowMeterSettings] = useState(false);

  /*
   * Remounts the settings dialog so it
   * picks up the latest saved values.
   */
  const [meterSettingsKey, setMeterSettingsKey] = useState(0);

  const [budgets, setBudgets] = useState<Budgets>({});

  const [showBudgets, setShowBudgets] = useState(false);

  const [budgetsKey, setBudgetsKey] = useState(0);

  const [profile, setProfile] = useState<Profile>({});

  const [showProfile, setShowProfile] = useState(false);

  const [profileKey, setProfileKey] = useState(0);

  /*
   * Prevents overlapping runs while
   * recurring copies are being written.
   */
  const generatingRecurring = useRef(false);

  /*
   * Listen to the current user's bills
   * in real time.
   *
   * Firestore path:
   *
   * users/{user.uid}/bills
   */
  useEffect(() => {
    if (!user) {
      return;
    }

    const billsRef = collection(db, "users", user.uid, "bills");

    const billsQuery = query(billsRef, orderBy("billingDate", "desc"));

    const unsubscribe = onSnapshot(
      billsQuery,
      (snapshot) => {
        const loadedBills = snapshot.docs.map(
          (document) =>
            ({
              id: document.id,
              ...document.data(),
            }) as Bill,
        );

        setBills(loadedBills);
        setLoading(false);
      },
      (error) => {
        console.error("Failed to load bills:", error);

        setBills([]);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [user]);

  /*
   * Listen to the current user's
   * meter settings.
   *
   * Firestore path:
   *
   * users/{user.uid}/settings/meters
   */
  useEffect(() => {
    if (!user) {
      return;
    }

    return subscribeToMeterSettings(user.uid, setMeterSettings);
  }, [user]);

  /*
   * Listen to the current user's
   * monthly budgets.
   *
   * Firestore path:
   *
   * users/{user.uid}/settings/budgets
   */
  useEffect(() => {
    if (!user) {
      return;
    }

    return subscribeToBudgets(user.uid, setBudgets);
  }, [user]);

  /*
   * Listen to the current user's
   * profile (preferred name).
   *
   * Firestore path:
   *
   * users/{user.uid}/settings/profile
   */
  useEffect(() => {
    if (!user) {
      return;
    }

    return subscribeToProfile(user.uid, setProfile);
  }, [user]);

  /*
   * Add this month's copies of recurring
   * bills. The snapshot listener picks up
   * the new bills, and the templates are
   * marked done so this doesn't repeat.
   */
  useEffect(() => {
    if (!user || loading || generatingRecurring.current) {
      return;
    }

    generatingRecurring.current = true;

    generateRecurringBills(user.uid, bills)
      .catch((error) => {
        console.error("Failed to add recurring bills:", error);
      })
      .finally(() => {
        generatingRecurring.current = false;
      });
  }, [user, bills, loading]);

  function handleOpenBudgets() {
    setBudgetsKey((value) => value + 1);
    setShowBudgets(true);
  }

  async function handleSaveBudgets(newBudgets: Budgets) {
    if (!user) {
      throw new Error("You must be logged in to save budgets.");
    }

    await saveBudgets(user.uid, newBudgets);

    setShowBudgets(false);
  }

  function handleOpenProfile() {
    setProfileKey((value) => value + 1);
    setShowProfile(true);
  }

  async function handleSaveProfile(newProfile: Profile) {
    if (!user) {
      throw new Error("You must be logged in to save your profile.");
    }

    await saveProfile(user.uid, newProfile);

    setShowProfile(false);
  }

  function handleOpenMeterSettings() {
    setMeterSettingsKey((value) => value + 1);
    setShowMeterSettings(true);
  }

  async function handleSaveMeterSettings(settings: MeterSettings) {
    if (!user) {
      throw new Error("You must be logged in to save meter settings.");
    }

    await saveMeterSettings(user.uid, settings);

    setShowMeterSettings(false);
  }

  /*
   * Open the form for adding a new bill.
   */
  function handleAddBill() {
    setEditingBill(null);
    setFormKey((value) => value + 1);
    setShowBillForm(true);
  }

  /*
   * Open the form for editing an existing bill.
   */
  function handleEditBill(bill: Bill) {
    setEditingBill(bill);
    setFormKey((value) => value + 1);
    setShowBillForm(true);
  }

  /*
   * Close the bill form.
   */
  function handleCloseBillForm() {
    setShowBillForm(false);
    setEditingBill(null);
  }

  /*
   * Save a new or edited bill.
   */
  async function handleSaveBill(bill: Omit<Bill, "id" | "createdAt">) {
    if (!user) {
      throw new Error("You must be logged in to save a bill.");
    }

    if (editingBill?.id) {
      await updateBill(user.uid, editingBill.id, bill);
    } else {
      await addBill(user.uid, bill);
    }

    setShowBillForm(false);
    setEditingBill(null);
  }

  /*
   * Delete a bill.
   */
  async function handleDeleteBill(billId: string) {
    if (!user) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this bill?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteBill(user.uid, billId);
    } catch (error) {
      console.error("Failed to delete bill:", error);

      alert("Failed to delete bill. Please try again.");
    }
  }

  /*
   * Sign out the current user.
   */
  async function handleLogout() {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);

      alert("Failed to logout. Please try again.");
    }
  }

  /*
   * Calculate dashboard totals.
   */
  const totalBills = bills.length;

  const totalAmount = bills.reduce(
    (total, bill) => total + Number(bill.amount || 0),
    0,
  );

  const paidAmount = bills
    .filter((bill) => bill.status === "paid")
    .reduce((total, bill) => total + Number(bill.amount || 0), 0);

  const unpaidAmount = bills
    .filter((bill) => bill.status === "unpaid")
    .reduce((total, bill) => total + Number(bill.amount || 0), 0);

  const overdueBills = bills.filter((bill) => isOverdue(bill));

  const overdueAmount = overdueBills.reduce(
    (total, bill) => total + Number(bill.amount || 0),
    0,
  );

  if (!user) {
    return null;
  }

  /*
   * Prefer the preferred name, then the first
   * name from the Google account.
   */
  const accountFirstName = user.displayName?.split(" ")[0] ?? "";

  const displayName = profile.preferredName || accountFirstName;

  return (
    <div className="dashboard-page">
      <nav className="dashboard-navbar">
        <div className="dashboard-brand">
          <div className="dashboard-brand-icon">🧾</div>

          <div>
            <h1>Bill Tracker</h1>
            <span>Manage your bills</span>
          </div>
        </div>

        <div className="dashboard-nav">
          <button
            type="button"
            className="dashboard-user"
            onClick={handleOpenProfile}
            title="Edit profile">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName ?? user.email ?? "User"}
              />
            ) : (
              <div className="dashboard-user-avatar">
                {(displayName || user.email || "U")
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}

            <div className="dashboard-user-info">
              <strong>{displayName || "User"}</strong>

              <span>{user.email}</span>
            </div>
          </button>

          <ThemeToggle />

          <button
            type="button"
            className="dashboard-logout-button"
            onClick={() => {
              void handleLogout();
            }}>
            Logout
          </button>
        </div>
      </nav>

      <main className="dashboard-content">
        <section className="dashboard-header">
          <div>
            <span className="dashboard-eyebrow">BILL MANAGEMENT</span>

            <h2>
              Welcome back
              {displayName && (
                <>
                  ,{" "}
                  <span className="dashboard-welcome-name">{displayName}</span>
                </>
              )}
              !
            </h2>

            <p>Track and manage all your household bills in one place.</p>
          </div>

          <div className="dashboard-header-actions">
            <button
              type="button"
              className="meter-settings-button"
              onClick={handleOpenMeterSettings}>
              ⚙️ Meter Settings
            </button>

            <button
              type="button"
              className="add-bill-button"
              onClick={handleAddBill}>
              + Add Bill
            </button>
          </div>
        </section>

        <MonthComparison bills={bills} loading={loading} />

        <section className="dashboard-stats">
          <div className="stat-card">
            <span className="stat-label">Total Bills</span>

            {loading ? (
              <span className="skeleton stat-skeleton" />
            ) : (
              <strong className="stat-value">{totalBills}</strong>
            )}
          </div>

          <div className="stat-card">
            <span className="stat-label">Total Amount</span>

            {loading ? (
              <span className="skeleton stat-skeleton" />
            ) : (
              <strong className="stat-value">₹{totalAmount.toFixed(2)}</strong>
            )}
          </div>

          <div className="stat-card">
            <span className="stat-label">Paid</span>

            {loading ? (
              <span className="skeleton stat-skeleton" />
            ) : (
              <strong className="stat-value">₹{paidAmount.toFixed(2)}</strong>
            )}
          </div>

          <div className="stat-card">
            <span className="stat-label">Unpaid</span>

            {loading ? (
              <span className="skeleton stat-skeleton" />
            ) : (
              <strong className="stat-value">₹{unpaidAmount.toFixed(2)}</strong>
            )}

            {overdueBills.length > 0 && (
              <span className="stat-note overdue">
                ⚠️ {overdueBills.length} overdue · ₹{overdueAmount.toFixed(2)}
              </span>
            )}
          </div>
        </section>

        {!loading && (
          <MonthlySummary
            bills={bills}
            budgets={budgets}
            onEditBudgets={handleOpenBudgets}
          />
        )}

        <section className="dashboard-bills-section">
          <div className="section-header">
            <div>
              <h3>Your Bills</h3>

              <p>View and manage your recent bills.</p>
            </div>
          </div>

          {loading ? (
            <Loader message="Loading your bills..." />
          ) : (
            <BillTable
              bills={bills}
              onDelete={handleDeleteBill}
              onEdit={handleEditBill}
            />
          )}
        </section>
      </main>

      <Credits />

      <BillForm
        key={formKey}
        open={showBillForm}
        editingBill={editingBill}
        onClose={handleCloseBillForm}
        onSave={handleSaveBill}
        meterSettings={meterSettings}
        onCustomizeMeters={handleOpenMeterSettings}
      />

      <MeterSettingsDialog
        key={meterSettingsKey}
        open={showMeterSettings}
        settings={meterSettings}
        onClose={() => setShowMeterSettings(false)}
        onSave={handleSaveMeterSettings}
      />

      <ProfileSettingsDialog
        key={profileKey}
        open={showProfile}
        profile={profile}
        defaultName={accountFirstName}
        onClose={() => setShowProfile(false)}
        onSave={handleSaveProfile}
      />

      <BudgetSettingsDialog
        key={budgetsKey}
        open={showBudgets}
        budgets={budgets}
        onClose={() => setShowBudgets(false)}
        onSave={handleSaveBudgets}
      />
    </div>
  );
}

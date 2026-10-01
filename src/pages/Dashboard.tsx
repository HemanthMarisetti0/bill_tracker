import { useEffect, useState } from "react";

import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

import { useAuth } from "../context/useAuth";
import { db } from "../lib/firebase";

import { logout } from "../services/authService";
import { addBill, deleteBill, updateBill } from "../services/billService";
import {
  saveMeterSettings,
  subscribeToMeterSettings,
} from "../services/meterSettingsService";

import BillForm from "../components/BillForm";
import BillTable from "../components/BillTable";
import MeterSettingsDialog from "../components/MeterSettingsDialog";

import type { Bill, MeterSettings } from "../types/bill";

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
      setBills([]);
      setLoading(false);
      return;
    }

    setLoading(true);

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

  if (!user) {
    return null;
  }

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
          <div className="dashboard-user">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName ?? user.email ?? "User"}
              />
            ) : (
              <div className="dashboard-user-avatar">
                {(user.displayName ?? user.email ?? "U")
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}

            <div className="dashboard-user-info">
              <strong>{user.displayName || "User"}</strong>

              <span>{user.email}</span>
            </div>
          </div>

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
              {user.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}!
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

        <section className="dashboard-stats">
          <div className="stat-card">
            <span className="stat-label">Total Bills</span>

            <strong className="stat-value">{totalBills}</strong>
          </div>

          <div className="stat-card">
            <span className="stat-label">Total Amount</span>

            <strong className="stat-value">₹{totalAmount.toFixed(2)}</strong>
          </div>

          <div className="stat-card">
            <span className="stat-label">Paid</span>

            <strong className="stat-value">₹{paidAmount.toFixed(2)}</strong>
          </div>

          <div className="stat-card">
            <span className="stat-label">Unpaid</span>

            <strong className="stat-value">₹{unpaidAmount.toFixed(2)}</strong>
          </div>
        </section>

        <section className="dashboard-bills-section">
          <div className="section-header">
            <div>
              <h3>Your Bills</h3>

              <p>View and manage your recent bills.</p>
            </div>
          </div>

          {loading ? (
            <div className="dashboard-loading">
              <div className="loading-spinner" />
              <p>Loading your bills...</p>
            </div>
          ) : (
            <BillTable
              bills={bills}
              onDelete={handleDeleteBill}
              onEdit={handleEditBill}
            />
          )}
        </section>
      </main>

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
    </div>
  );
}

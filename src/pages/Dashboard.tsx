import { useEffect, useMemo, useRef, useState } from "react";

import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

import { useAuth } from "../context/useAuth";
import { CategoriesContext } from "../context/CategoriesContext";
import { db } from "../lib/firestore";
import {
  buildCategoryCatalog,
  INVESTMENT_CATEGORY,
  SAVINGS_CATEGORY,
} from "../lib/categories";

import { logout } from "../services/authService";
import { addBill, deleteBill, updateBill } from "../services/billService";
import {
  saveMeterSettings,
  subscribeToMeterSettings,
} from "../services/meterSettingsService";
import { saveBudgets, subscribeToBudgets } from "../services/budgetService";
import { saveProfile, subscribeToProfile } from "../services/profileService";
import {
  saveCategorySettings,
  subscribeToCategorySettings,
} from "../services/categoryService";
import {
  addIncome,
  deleteIncome,
  subscribeToIncome,
  updateIncome,
} from "../services/incomeService";
import { generateRecurringBills } from "../services/recurringService";
import { getCurrentMonthKey, isOverdue, toMonthKey } from "../lib/dates";

import BillForm from "../components/BillForm";
import BillTable from "../components/BillTable";
import MeterSettingsDialog from "../components/MeterSettingsDialog";
import BudgetSettingsDialog from "../components/BudgetSettingsDialog";
import ProfileSettingsDialog from "../components/ProfileSettingsDialog";
import IncomeForm from "../components/IncomeForm";
import IncomeTable from "../components/IncomeTable";
import CategoryForm from "../components/CategoryForm";
import CategoryTable from "../components/CategoryTable";
import CashflowSummary from "../components/CashflowSummary";
import MonthlySummary from "../components/MonthlySummary";
import MonthComparison from "../components/MonthComparison";
import Loader from "../components/Loader";
import ThemeToggle from "../components/ThemeToggle";
import Credits from "../components/Credits";

import type {
  Bill,
  Budgets,
  CategoryId,
  CategorySettings,
  CustomCategory,
  Income,
  MeterSettings,
  Profile,
} from "../types/bill";

import "./Dashboard.css";

type Tab =
  | "overview"
  | "bills"
  | "investments"
  | "savings"
  | "income"
  | "types";

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "bills", label: "Bills", icon: "🧾" },
  { id: "investments", label: "Investments", icon: "📈" },
  { id: "savings", label: "Savings", icon: "🐷" },
  { id: "income", label: "Income", icon: "💼" },
  { id: "types", label: "Types", icon: "🏷️" },
];

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function sumAmounts(bills: Bill[]): number {
  return bills.reduce((total, bill) => total + Number(bill.amount || 0), 0);
}

export default function Dashboard() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  const [showBillForm, setShowBillForm] = useState(false);

  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  /*
   * Category picked when the form
   * opens for a new bill.
   */
  const [newBillCategory, setNewBillCategory] = useState<CategoryId>();

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

  const [income, setIncome] = useState<Income[]>([]);

  const [incomeLoading, setIncomeLoading] = useState(true);

  const [showIncomeForm, setShowIncomeForm] = useState(false);

  const [editingIncome, setEditingIncome] = useState<Income | null>(null);

  const [incomeFormKey, setIncomeFormKey] = useState(0);

  const [categorySettings, setCategorySettings] = useState<CategorySettings>(
    {},
  );

  const [showCategoryForm, setShowCategoryForm] = useState(false);

  const [categoryFormKey, setCategoryFormKey] = useState(0);

  const catalog = useMemo(
    () => buildCategoryCatalog(categorySettings),
    [categorySettings],
  );

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
   * Listen to the current user's
   * own and hidden bill types.
   *
   * Firestore path:
   *
   * users/{user.uid}/settings/categories
   */
  useEffect(() => {
    if (!user) {
      return;
    }

    return subscribeToCategorySettings(user.uid, setCategorySettings);
  }, [user]);

  /*
   * Listen to the current user's
   * salary and other income.
   *
   * Firestore path:
   *
   * users/{user.uid}/income
   */
  useEffect(() => {
    if (!user) {
      return;
    }

    return subscribeToIncome(user.uid, (entries) => {
      setIncome(entries);
      setIncomeLoading(false);
    });
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
   * Open the form for adding a new bill,
   * starting on the given category.
   */
  function handleAddBill(category?: CategoryId) {
    setEditingBill(null);
    setNewBillCategory(
      category ??
        (catalog.visible.includes("water") ? "water" : catalog.visible[0]),
    );
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

  function handleAddIncome() {
    setEditingIncome(null);
    setIncomeFormKey((value) => value + 1);
    setShowIncomeForm(true);
  }

  function handleEditIncome(entry: Income) {
    setEditingIncome(entry);
    setIncomeFormKey((value) => value + 1);
    setShowIncomeForm(true);
  }

  function handleCloseIncomeForm() {
    setShowIncomeForm(false);
    setEditingIncome(null);
  }

  async function handleSaveIncome(entry: Omit<Income, "id" | "createdAt">) {
    if (!user) {
      throw new Error("You must be logged in to save income.");
    }

    if (editingIncome?.id) {
      await updateIncome(user.uid, editingIncome.id, entry);
    } else {
      await addIncome(user.uid, entry);
    }

    handleCloseIncomeForm();
  }

  async function handleDeleteIncome(incomeId: string) {
    if (!user) {
      return;
    }

    if (!window.confirm("Are you sure you want to delete this income?")) {
      return;
    }

    try {
      await deleteIncome(user.uid, incomeId);
    } catch (error) {
      console.error("Failed to delete income:", error);

      alert("Failed to delete income. Please try again.");
    }
  }

  function handleOpenCategoryForm() {
    setCategoryFormKey((value) => value + 1);
    setShowCategoryForm(true);
  }

  /*
   * Writes the whole types document;
   * missing lists are saved empty.
   */
  async function writeCategorySettings(settings: CategorySettings) {
    if (!user) {
      throw new Error("You must be logged in to change bill types.");
    }

    await saveCategorySettings(user.uid, {
      custom: settings.custom ?? [],
      hidden: settings.hidden ?? [],
    });
  }

  async function handleAddCategory(category: Omit<CustomCategory, "id">) {
    await writeCategorySettings({
      ...categorySettings,
      custom: [
        ...(categorySettings.custom ?? []),
        { ...category, id: `custom-${Date.now().toString(36)}` },
      ],
    });

    setShowCategoryForm(false);
  }

  async function handleToggleCategoryHidden(category: CategoryId) {
    const hidden = categorySettings.hidden ?? [];

    try {
      await writeCategorySettings({
        ...categorySettings,
        hidden: hidden.includes(category)
          ? hidden.filter((item) => item !== category)
          : [...hidden, category],
      });
    } catch (error) {
      console.error("Failed to update type:", error);

      alert("Failed to update type. Please try again.");
    }
  }

  async function handleDeleteCategory(category: CategoryId) {
    const { label } = catalog.getConfig(category);

    const used = bills.filter((bill) => bill.category === category).length;

    /*
     * Bills keep their type, so a type
     * in use can only be hidden.
     */
    if (used > 0) {
      alert(
        `"${label}" is used by ${used} ${used === 1 ? "bill" : "bills"}. ` +
          "Move or delete those bills first, or hide the type instead.",
      );

      return;
    }

    if (!window.confirm(`Delete the "${label}" type?`)) {
      return;
    }

    try {
      await writeCategorySettings({
        custom: (categorySettings.custom ?? []).filter(
          (item) => item.id !== category,
        ),
        hidden: (categorySettings.hidden ?? []).filter(
          (item) => item !== category,
        ),
      });
    } catch (error) {
      console.error("Failed to delete type:", error);

      alert("Failed to delete type. Please try again.");
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
   * Investments and savings are money set aside,
   * so they're kept out of spending.
   */
  const expenseBills = useMemo(
    () =>
      bills.filter(
        (bill) =>
          bill.category !== INVESTMENT_CATEGORY &&
          bill.category !== SAVINGS_CATEGORY,
      ),
    [bills],
  );

  const investmentBills = useMemo(
    () => bills.filter((bill) => bill.category === INVESTMENT_CATEGORY),
    [bills],
  );

  const savingsBills = useMemo(
    () => bills.filter((bill) => bill.category === SAVINGS_CATEGORY),
    [bills],
  );

  /*
   * Calculate bill totals.
   */
  const totalBills = expenseBills.length;

  const totalAmount = sumAmounts(expenseBills);

  const paidAmount = sumAmounts(
    expenseBills.filter((bill) => bill.status === "paid"),
  );

  const unpaidAmount = sumAmounts(
    expenseBills.filter((bill) => bill.status === "unpaid"),
  );

  const overdueBills = expenseBills.filter((bill) => isOverdue(bill));

  const overdueAmount = sumAmounts(overdueBills);

  /*
   * Calculate investment totals.
   */
  const currentMonth = getCurrentMonthKey();

  const investedThisMonth = sumAmounts(
    investmentBills.filter(
      (bill) => toMonthKey(bill.billingDate) === currentMonth,
    ),
  );

  const investedThisYear = sumAmounts(
    investmentBills.filter(
      (bill) => bill.billingDate.slice(0, 4) === currentMonth.slice(0, 4),
    ),
  );

  const investedTotal = sumAmounts(investmentBills);

  const monthlyInvestments = investmentBills.filter(
    (bill) => bill.recurring,
  ).length;

  /*
   * Calculate savings totals.
   */
  const savedThisMonth = sumAmounts(
    savingsBills.filter((bill) => toMonthKey(bill.billingDate) === currentMonth),
  );

  const savedThisYear = sumAmounts(
    savingsBills.filter(
      (bill) => bill.billingDate.slice(0, 4) === currentMonth.slice(0, 4),
    ),
  );

  const savedTotal = sumAmounts(savingsBills);

  const monthlySavings = savingsBills.filter((bill) => bill.recurring).length;

  if (!user) {
    return null;
  }

  /*
   * Prefer the preferred name, then the first
   * name from the Google account.
   */
  const accountFirstName = user.displayName?.split(" ")[0] ?? "";

  const displayName = profile.preferredName || accountFirstName;

  /*
   * The main header button follows
   * the open tab.
   */
  const primaryAction = {
    overview: { label: "+ Add Bill", onClick: () => handleAddBill() },
    bills: { label: "+ Add Bill", onClick: () => handleAddBill() },
    investments: {
      label: "+ Add Investment",
      onClick: () => handleAddBill(INVESTMENT_CATEGORY),
    },
    savings: {
      label: "+ Add Savings",
      onClick: () => handleAddBill(SAVINGS_CATEGORY),
    },
    income: { label: "+ Add Salary", onClick: handleAddIncome },
    types: { label: "+ Add Type", onClick: handleOpenCategoryForm },
  }[activeTab];

  return (
    <CategoriesContext.Provider value={catalog}>
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
                    <span className="dashboard-welcome-name">
                      {displayName}
                    </span>
                  </>
                )}
                !
              </h2>

              <p>Track and manage all your household bills in one place.</p>
            </div>

            <div className="dashboard-header-actions">
              {(activeTab === "bills" || activeTab === "types") && (
                <button
                  type="button"
                  className="meter-settings-button"
                  onClick={handleOpenMeterSettings}>
                  ⚙️ Meter Settings
                </button>
              )}

              <button
                type="button"
                className="add-bill-button"
                onClick={primaryAction.onClick}>
                {primaryAction.label}
              </button>
            </div>
          </section>

          <div className="dashboard-tabs" role="tablist" aria-label="Sections">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`dashboard-tab-${tab.id}`}
                aria-selected={activeTab === tab.id}
                aria-controls="dashboard-tab-panel"
                className={activeTab === tab.id ? "active" : ""}
                onClick={() => setActiveTab(tab.id)}>
                <span aria-hidden="true">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <div
            id="dashboard-tab-panel"
            role="tabpanel"
            aria-labelledby={`dashboard-tab-${activeTab}`}>
            {activeTab === "overview" && (
              <>
                <CashflowSummary
                  expenses={expenseBills}
                  investments={investmentBills}
                  savings={savingsBills}
                  income={income}
                  loading={loading || incomeLoading}
                  onAddSalary={handleAddIncome}
                />

                <MonthComparison bills={expenseBills} loading={loading} />

                {!loading && (
                  <MonthlySummary
                    bills={expenseBills}
                    budgets={budgets}
                    onEditBudgets={handleOpenBudgets}
                  />
                )}
              </>
            )}

            {activeTab === "bills" && (
              <>
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
                      <strong className="stat-value">
                        ₹{totalAmount.toFixed(2)}
                      </strong>
                    )}
                  </div>

                  <div className="stat-card">
                    <span className="stat-label">Paid</span>

                    {loading ? (
                      <span className="skeleton stat-skeleton" />
                    ) : (
                      <strong className="stat-value">
                        ₹{paidAmount.toFixed(2)}
                      </strong>
                    )}
                  </div>

                  <div className="stat-card">
                    <span className="stat-label">Unpaid</span>

                    {loading ? (
                      <span className="skeleton stat-skeleton" />
                    ) : (
                      <strong className="stat-value">
                        ₹{unpaidAmount.toFixed(2)}
                      </strong>
                    )}

                    {overdueBills.length > 0 && (
                      <span className="stat-note overdue">
                        ⚠️ {overdueBills.length} overdue · ₹
                        {overdueAmount.toFixed(2)}
                      </span>
                    )}
                  </div>
                </section>

                <section className="dashboard-bills-section">
                  <div className="section-header">
                    <div>
                      <h3>Your Bills</h3>

                      <p>
                        View and manage your recent bills. Investments and
                        savings have their own tabs.
                      </p>
                    </div>
                  </div>

                  {loading ? (
                    <Loader message="Loading your bills..." />
                  ) : (
                    <BillTable
                      bills={expenseBills}
                      onDelete={handleDeleteBill}
                      onEdit={handleEditBill}
                    />
                  )}
                </section>
              </>
            )}

            {activeTab === "investments" && (
              <>
                <section className="dashboard-stats">
                  <div className="stat-card">
                    <span className="stat-label">This Month</span>

                    {loading ? (
                      <span className="skeleton stat-skeleton" />
                    ) : (
                      <strong className="stat-value">
                        {formatCurrency(investedThisMonth)}
                      </strong>
                    )}
                  </div>

                  <div className="stat-card">
                    <span className="stat-label">This Year</span>

                    {loading ? (
                      <span className="skeleton stat-skeleton" />
                    ) : (
                      <strong className="stat-value">
                        {formatCurrency(investedThisYear)}
                      </strong>
                    )}
                  </div>

                  <div className="stat-card">
                    <span className="stat-label">Total Invested</span>

                    {loading ? (
                      <span className="skeleton stat-skeleton" />
                    ) : (
                      <strong className="stat-value">
                        {formatCurrency(investedTotal)}
                      </strong>
                    )}
                  </div>

                  <div className="stat-card">
                    <span className="stat-label">Monthly SIPs</span>

                    {loading ? (
                      <span className="skeleton stat-skeleton" />
                    ) : (
                      <strong className="stat-value">
                        {monthlyInvestments}
                      </strong>
                    )}
                  </div>
                </section>

                <section className="dashboard-bills-section">
                  <div className="section-header">
                    <div>
                      <h3>Your Investments</h3>

                      <p>SIPs, RDs, PPF and other money you've invested.</p>
                    </div>
                  </div>

                  {loading ? (
                    <Loader message="Loading your investments..." />
                  ) : (
                    <BillTable
                      bills={investmentBills}
                      onDelete={handleDeleteBill}
                      onEdit={handleEditBill}
                      hideCategoryFilter
                      emptyIcon="📈"
                      emptyTitle="No investments yet"
                      emptyMessage="Add a SIP, RD or any other investment to track it here."
                    />
                  )}
                </section>
              </>
            )}

            {activeTab === "savings" && (
              <>
                <section className="dashboard-stats">
                  <div className="stat-card">
                    <span className="stat-label">This Month</span>

                    {loading ? (
                      <span className="skeleton stat-skeleton" />
                    ) : (
                      <strong className="stat-value">
                        {formatCurrency(savedThisMonth)}
                      </strong>
                    )}
                  </div>

                  <div className="stat-card">
                    <span className="stat-label">This Year</span>

                    {loading ? (
                      <span className="skeleton stat-skeleton" />
                    ) : (
                      <strong className="stat-value">
                        {formatCurrency(savedThisYear)}
                      </strong>
                    )}
                  </div>

                  <div className="stat-card">
                    <span className="stat-label">Total Saved</span>

                    {loading ? (
                      <span className="skeleton stat-skeleton" />
                    ) : (
                      <strong className="stat-value">
                        {formatCurrency(savedTotal)}
                      </strong>
                    )}
                  </div>

                  <div className="stat-card">
                    <span className="stat-label">Monthly Savings</span>

                    {loading ? (
                      <span className="skeleton stat-skeleton" />
                    ) : (
                      <strong className="stat-value">{monthlySavings}</strong>
                    )}
                  </div>
                </section>

                <section className="dashboard-bills-section">
                  <div className="section-header">
                    <div>
                      <h3>Your Savings</h3>

                      <p>Money put into savings, FDs and emergency funds.</p>
                    </div>
                  </div>

                  {loading ? (
                    <Loader message="Loading your savings..." />
                  ) : (
                    <BillTable
                      bills={savingsBills}
                      onDelete={handleDeleteBill}
                      onEdit={handleEditBill}
                      hideCategoryFilter
                      emptyIcon="🐷"
                      emptyTitle="No savings yet"
                      emptyMessage="Add money you've put into savings to track it here."
                    />
                  )}
                </section>
              </>
            )}

            {activeTab === "income" && (
              <section className="dashboard-bills-section">
                <div className="section-header">
                  <div>
                    <h3>Your Income</h3>

                    <p>Salary and other money coming in.</p>
                  </div>
                </div>

                {incomeLoading ? (
                  <Loader message="Loading your income..." />
                ) : (
                  <IncomeTable
                    income={income}
                    onEdit={handleEditIncome}
                    onDelete={handleDeleteIncome}
                  />
                )}
              </section>
            )}

            {activeTab === "types" && (
              <section className="dashboard-bills-section">
                <div className="section-header">
                  <div>
                    <h3>Bill Types</h3>

                    <p>
                      Hide types you don't use, or add your own. Hidden types
                      stay on existing bills.
                    </p>
                  </div>
                </div>

                <CategoryTable
                  bills={bills}
                  onToggleHidden={handleToggleCategoryHidden}
                  onDelete={handleDeleteCategory}
                />
              </section>
            )}
          </div>
        </main>

        <Credits />

        <BillForm
          key={formKey}
          open={showBillForm}
          editingBill={editingBill}
          defaultCategory={newBillCategory}
          onClose={handleCloseBillForm}
          onSave={handleSaveBill}
          meterSettings={meterSettings}
          onCustomizeMeters={handleOpenMeterSettings}
        />

        <IncomeForm
          key={`income-${incomeFormKey}`}
          open={showIncomeForm}
          editingIncome={editingIncome}
          onClose={handleCloseIncomeForm}
          onSave={handleSaveIncome}
        />

        <CategoryForm
          key={`category-${categoryFormKey}`}
          open={showCategoryForm}
          onClose={() => setShowCategoryForm(false)}
          onSave={handleAddCategory}
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
    </CategoriesContext.Provider>
  );
}

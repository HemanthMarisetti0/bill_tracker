import type { PaymentMethod } from "../types/bill";

export interface PaymentMethodConfig {
  label: string;
  icon: string;
}

export const paymentMethodConfig: Record<PaymentMethod, PaymentMethodConfig> = {
  upi: { label: "UPI", icon: "📲" },
  "credit-card": { label: "Credit Card", icon: "💳" },
  "debit-card": { label: "Debit Card", icon: "🏧" },
  "net-banking": { label: "Net Banking", icon: "🏦" },
  "auto-debit": { label: "Auto-debit", icon: "🔄" },
  cash: { label: "Cash", icon: "💵" },
  wallet: { label: "Wallet", icon: "👛" },
  other: { label: "Other", icon: "🧾" },
};

export const paymentMethods = Object.keys(
  paymentMethodConfig,
) as PaymentMethod[];

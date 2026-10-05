import type { IncomeSource } from "../types/bill";

export interface IncomeSourceConfig {
  label: string;
  icon: string;
}

export const incomeSourceConfig: Record<IncomeSource, IncomeSourceConfig> = {
  salary: { label: "Salary", icon: "💼" },
  bonus: { label: "Bonus", icon: "🎉" },
  freelance: { label: "Freelance", icon: "🧑‍💻" },
  rental: { label: "Rental Income", icon: "🏘️" },
  interest: { label: "Interest / Dividends", icon: "🏦" },
  other: { label: "Other Income", icon: "💰" },
};

export const incomeSources = Object.keys(incomeSourceConfig) as IncomeSource[];

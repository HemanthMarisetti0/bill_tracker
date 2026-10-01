import type { BillCategory, MeterCategory } from "../types/bill";

export interface CategoryConfig {
  label: string;
  icon: string;
  description: string;
  meterBased: boolean;
  unit?: string;
}

export const categoryConfig: Record<BillCategory, CategoryConfig> = {
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

  mobile: {
    label: "Mobile",
    icon: "📱",
    description: "Track your mobile bill",
    meterBased: false,
  },

  dth: {
    label: "DTH / Cable",
    icon: "📺",
    description: "Track your DTH or cable TV recharge",
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

  emi: {
    label: "EMI / Loan",
    icon: "🏦",
    description: "Track home, vehicle or personal loan EMIs",
    meterBased: false,
  },

  insurance: {
    label: "Insurance",
    icon: "🛡️",
    description: "Track health, vehicle and life insurance premiums",
    meterBased: false,
  },

  subscriptions: {
    label: "Subscriptions",
    icon: "🎬",
    description: "Track OTT, music and other subscriptions",
    meterBased: false,
  },

  education: {
    label: "Education",
    icon: "🎓",
    description: "Track school, college and tuition fees",
    meterBased: false,
  },

  "credit-card": {
    label: "Credit Card Bill",
    icon: "💳",
    description: "Track monthly credit card bill payments",
    meterBased: false,
  },

  investments: {
    label: "Investments / SIP",
    icon: "📈",
    description: "Track mutual fund SIPs, RD, PPF and other investments",
    meterBased: false,
  },

  taxes: {
    label: "Taxes",
    icon: "🏛️",
    description: "Track property tax, income tax and other tax payments",
    meterBased: false,
  },

  donations: {
    label: "Donations / Charity",
    icon: "🤲",
    description: "Track donations and charity contributions",
    meterBased: false,
  },

  assets: {
    label: "Assets",
    icon: "💎",
    description:
      "Track gold, electronics, furniture and other things you buy to keep",
    meterBased: false,
  },

  groceries: {
    label: "Groceries",
    icon: "🛒",
    description: "Track groceries and household supplies",
    meterBased: false,
  },

  "meat-fish": {
    label: "Meat, Fish & Eggs",
    icon: "🍗",
    description: "Track chicken, mutton, fish and egg purchases",
    meterBased: false,
  },

  bakery: {
    label: "Bakery & Snacks",
    icon: "🥐",
    description: "Track bread, biscuits, sweets and snacks",
    meterBased: false,
  },

  milk: {
    label: "Dairy Products",
    icon: "🥛",
    description: "Track milk, curd, paneer, butter and other dairy products",
    meterBased: false,
  },

  "drinking-water": {
    label: "Drinking Water",
    icon: "🚰",
    description: "Track water cans and drinking water delivery",
    meterBased: false,
  },

  juice: {
    label: "Juice",
    icon: "🧃",
    description: "Track juice and beverage purchases",
    meterBased: false,
  },

  fruits: {
    label: "Fruits",
    icon: "🍎",
    description: "Track fresh fruits and dry fruits purchases",
    meterBased: false,
  },

  vegetables: {
    label: "Vegetables",
    icon: "🥦",
    description: "Track vegetables, greens and herbs purchases",
    meterBased: false,
  },

  food: {
    label: "Food",
    icon: "🍔",
    description: "Track dining out and food delivery",
    meterBased: false,
  },

  medical: {
    label: "Medical",
    icon: "💊",
    description: "Track medicines, doctor visits and tests",
    meterBased: false,
  },

  shopping: {
    label: "Shopping",
    icon: "🛍️",
    description: "Track clothes and household shopping",
    meterBased: false,
  },

  grooming: {
    label: "Grooming & Personal Care",
    icon: "💇",
    description:
      "Track haircuts, shaving, salon visits, skincare and toiletries",
    meterBased: false,
  },

  "domestic-help": {
    label: "Domestic Help",
    icon: "🧹",
    description: "Track maid, cook or driver salary",
    meterBased: false,
  },

  laundry: {
    label: "Laundry & Ironing",
    icon: "👕",
    description: "Track laundry, ironing and dry cleaning charges",
    meterBased: false,
  },

  gym: {
    label: "Gym & Fitness",
    icon: "🏋️",
    description: "Track gym, yoga and sports memberships",
    meterBased: false,
  },

  pets: {
    label: "Pets",
    icon: "🐾",
    description: "Track pet food, vet visits and pet grooming",
    meterBased: false,
  },

  kids: {
    label: "Kids & Baby Care",
    icon: "🧸",
    description: "Track diapers, baby food, toys and kids' supplies",
    meterBased: false,
  },
  movies: {
    label: "Movies",
    icon: "🍿",
    description: "Track movie tickets and cinema expenses",
    meterBased: false,
  },
  petrol: {
    label: "Petrol",
    icon: "⛽",
    description: "Track petrol and fuel expenses",
    meterBased: false,
  },

  vehicle: {
    label: "Vehicle Service",
    icon: "🔧",
    description: "Track vehicle servicing and repairs",
    meterBased: false,
  },

  "parking-tolls": {
    label: "Parking & Tolls",
    icon: "🅿️",
    description: "Track FASTag recharges, tolls and parking fees",
    meterBased: false,
  },

  travel: {
    label: "Travel",
    icon: "✈️",
    description: "Track travel expenses",
    meterBased: false,
  },

  pooja: {
    label: "Pooja",
    icon: "🪔",
    description: "Track pooja and religious expenses",
    meterBased: false,
  },

  gifts: {
    label: "Gifts & Functions",
    icon: "🎁",
    description: "Track gifts, weddings, birthdays and festivals",
    meterBased: false,
  },

  other: {
    label: "Other",
    icon: "🧾",
    description: "Track any other bill",
    meterBased: false,
  },
};

export interface CategoryGroup {
  label: string;
  icon: string;
  categories: BillCategory[];
}

export const categoryGroups: CategoryGroup[] = [
  {
    label: "Utilities",
    icon: "💡",
    categories: ["water", "electricity", "gas", "internet", "mobile", "dth"],
  },
  {
    label: "Home & Finance",
    icon: "🏠",
    categories: [
      "rent",
      "maintenance",
      "emi",
      "insurance",
      "subscriptions",
      "education",
      "credit-card",
      "investments",
      "taxes",
      "assets",
      "donations",
    ],
  },
  {
    label: "Household",
    icon: "🛒",
    categories: [
      "groceries",
      "meat-fish",
      "bakery",
      "milk",
      "drinking-water",
      "juice",
      "fruits",
      "vegetables",
      "food",
      "medical",
      "shopping",
      "grooming",
      "domestic-help",
      "laundry",
    ],
  },
  {
    label: "Health & Lifestyle",
    icon: "🌿",
    categories: ["gym", "pets", "kids"],
  },
  {
    label: "Travel & Others",
    icon: "🧭",
    categories: [
      "movies",
      "petrol",
      "vehicle",
      "parking-tolls",
      "travel",
      "pooja",
      "gifts",
      "other",
    ],
  },
];

/*
 * Display order for category pickers,
 * filters and summaries.
 */
export const categories = categoryGroups.flatMap((group) => group.categories);

export function getCategoryGroup(category: BillCategory): CategoryGroup {
  return (
    categoryGroups.find((group) => group.categories.includes(category)) ??
    categoryGroups[0]
  );
}

export const meterCategories: BillCategory[] = ["water", "electricity", "gas"];

export function isMeterCategory(
  category: BillCategory,
): category is MeterCategory {
  return meterCategories.includes(category);
}

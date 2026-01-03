// Expense categories
export const CATEGORIES = [
  "Food & Dining",
  "Transportation",
  "Shopping",
  "Bills & Utilities",
  "Entertainment",
  "Health & Fitness",
  "Travel",
  "Subscriptions",
  "Personal Care",
  "Education",
  "Gifts & Donations",
  "Other",
];

// Income categories
export const INCOME_CATEGORIES = [
  "Salary/Wages",
  "Freelance/Gig",
  "Investment/Dividends",
  "Rental Income",
  "Business Income",
  "Gift Received",
  "Refund",
  "Side Hustle",
  "Other",
];

export const CATEGORY_STYLES = {
  "Food & Dining": { accent: "#FFB8F3", gradient: ["#FFB8F3", "#FFDCD5"], icon: "🍽️" },
  "Transportation": {
    accent: "#BFD4FF",
    gradient: ["#BFD4FF", "#E5EFFF"],
    icon: "🚗",
  },
  "Shopping": { accent: "#D8CCFF", gradient: ["#D8CCFF", "#BCF3EF"], icon: "🛍️" },
  "Bills & Utilities": { accent: "#FEF0B8", gradient: ["#FEF0B8", "#FAD899"], icon: "🧾" },
  "Entertainment": {
    accent: "#BCF3EF",
    gradient: ["#BCF3EF", "#BFD4FF"],
    icon: "🎬",
  },
  "Health & Fitness": { accent: "#FFDCD5", gradient: ["#FFDCD5", "#FEF0B8"], icon: "🩺" },
  "Travel": { accent: "#BCF3EF", gradient: ["#BCF3EF", "#D8CCFF"], icon: "✈️" },
  "Subscriptions": {
    accent: "#FAD899",
    gradient: ["#FAD899", "#FEF0B8"],
    icon: "📱",
  },
  "Personal Care": { accent: "#FFDCD5", gradient: ["#FFDCD5", "#FFB8F3"], icon: "💅" },
  "Education": { accent: "#CBFACF", gradient: ["#CBFACF", "#E9FFE9"], icon: "📚" },
  "Gifts & Donations": { accent: "#D8CCFF", gradient: ["#D8CCFF", "#FEF0B8"], icon: "🎁" },
  "Other": { accent: "#F6F6F6", gradient: ["#F6F6F6", "#E5E7EB"], icon: "✨" },
};

// Income category styles
export const INCOME_CATEGORY_STYLES = {
  "Salary/Wages": { accent: "#10B981", gradient: ["#10B981", "#34D399"], icon: "💰" },
  "Freelance/Gig": { accent: "#3B82F6", gradient: ["#3B82F6", "#60A5FA"], icon: "💼" },
  "Investment/Dividends": { accent: "#F59E0B", gradient: ["#F59E0B", "#FBBF24"], icon: "📈" },
  "Rental Income": { accent: "#8B5CF6", gradient: ["#8B5CF6", "#A78BFA"], icon: "🏠" },
  "Business Income": { accent: "#06B6D4", gradient: ["#06B6D4", "#22D3EE"], icon: "🏢" },
  "Gift Received": { accent: "#EC4899", gradient: ["#EC4899", "#F472B6"], icon: "🎁" },
  "Refund": { accent: "#14B8A6", gradient: ["#14B8A6", "#5EEAD4"], icon: "↩️" },
  "Side Hustle": { accent: "#F97316", gradient: ["#F97316", "#FB923C"], icon: "⚡" },
  "Other": { accent: "#6B7280", gradient: ["#6B7280", "#9CA3AF"], icon: "✨" },
};

// This function will be enhanced to handle custom categories dynamically
// For now, it normalizes to standard categories
export function normalizeCategory(category, customCategories = []) {
  if (!category) return "Other";
  const trimmed = String(category).trim();
  
  // Check custom categories first
  const customMatch = customCategories.find(
    (c) => c.category_name && c.category_name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (customMatch) {
    return customMatch.category_name;
  }
  
  // Check standard categories
  const found = CATEGORIES.find(
    (c) => c.toLowerCase() === trimmed.toLowerCase(),
  );
  return found || trimmed; // Return the original if not found (might be a custom category)
}

// Get all categories including custom ones (for expenses)
export function getAllCategories(customCategories = []) {
  const custom = customCategories
    .filter((c) => !c.type || c.type === 'expense')
    .map((c) => c.category_name)
    .filter(Boolean);
  return [...CATEGORIES, ...custom];
}

// Get all income categories including custom ones
export function getAllIncomeCategories(customCategories = []) {
  const customIncome = customCategories
    .filter((c) => c.type === 'income')
    .map((c) => c.category_name)
    .filter(Boolean);
  return [...INCOME_CATEGORIES, ...customIncome];
}

// Get category style (including custom categories)
export function getCategoryStyle(categoryName, customCategories = [], isIncome = false) {
  // Check custom categories first
  const custom = customCategories.find(
    (c) => c.category_name && c.category_name.toLowerCase() === categoryName.toLowerCase() && 
          ((isIncome && c.type === 'income') || (!isIncome && (!c.type || c.type === 'expense'))),
  );
  if (custom) {
    return {
      accent: custom.color || "#F6F6F6",
      gradient: [custom.color || "#F6F6F6", custom.color || "#E5E7EB"],
      icon: custom.icon || "✨",
    };
  }
  
  // If income, use income category styles
  if (isIncome) {
    return INCOME_CATEGORY_STYLES[categoryName] || INCOME_CATEGORY_STYLES["Other Income"];
  }
  
  // Fall back to standard expense categories
  return CATEGORY_STYLES[categoryName] || CATEGORY_STYLES.Other;
}

// Get income category style (including custom income categories)
export function getIncomeCategoryStyle(categoryName, customCategories = []) {
  return getCategoryStyle(categoryName, customCategories, true);
}

// Normalize income category
export function normalizeIncomeCategory(category, customCategories = []) {
  if (!category) return "Other Income";
  const trimmed = String(category).trim();
  
  // Check custom income categories first
  const customMatch = customCategories.find(
    (c) => c.type === 'income' && c.category_name && c.category_name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (customMatch) {
    return customMatch.category_name;
  }
  
  // Check standard income categories
  const found = INCOME_CATEGORIES.find(
    (c) => c.toLowerCase() === trimmed.toLowerCase(),
  );
  return found || trimmed; // Return the original if not found (might be a custom category)
}

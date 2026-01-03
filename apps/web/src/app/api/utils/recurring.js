import sql from "./sql";

/**
 * Calculate expected monthly amount from a recurring item
 * @param {number} amountCents - Amount in cents for one occurrence
 * @param {string} frequency - Frequency: 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually'
 * @returns {number} Expected monthly amount in cents
 */
export function calculateMonthlyAmount(amountCents, frequency) {
  if (!amountCents || !frequency) return 0;

  switch (frequency) {
    case 'weekly':
      // 4.33 weeks per month on average
      return Math.round(amountCents * 4.33);
    case 'biweekly':
      // 2.17 biweekly periods per month on average
      return Math.round(amountCents * 2.17);
    case 'monthly':
      return amountCents;
    case 'quarterly':
      // Divide by 3 months
      return Math.round(amountCents / 3);
    case 'annually':
      // Divide by 12 months
      return Math.round(amountCents / 12);
    default:
      return 0;
  }
}

/**
 * Get expected monthly expenses from recurring expenses
 * @param {string} deviceId
 * @returns {Promise<number>} Expected monthly expenses in cents
 */
export async function getExpectedMonthlyExpenses(deviceId) {
  const rows = await sql(
    `SELECT amount_cents, recurrence_frequency 
     FROM public.expenses 
     WHERE device_id = $1 
     AND type = 'expense' 
     AND is_recurring = true 
     AND recurrence_frequency IS NOT NULL`,
    [deviceId],
  );

  let total = 0;
  for (const row of rows || []) {
    total += calculateMonthlyAmount(row.amount_cents, row.recurrence_frequency);
  }

  return total;
}

/**
 * Get expected monthly income from recurring income
 * @param {string} deviceId
 * @returns {Promise<number>} Expected monthly income in cents
 */
export async function getExpectedMonthlyIncome(deviceId) {
  const rows = await sql(
    `SELECT amount_cents, recurrence_frequency 
     FROM public.expenses 
     WHERE device_id = $1 
     AND type = 'income' 
     AND is_recurring = true 
     AND recurrence_frequency IS NOT NULL`,
    [deviceId],
  );

  let total = 0;
  for (const row of rows || []) {
    total += calculateMonthlyAmount(row.amount_cents, row.recurrence_frequency);
  }

  return total;
}


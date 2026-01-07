import sql from "../../utils/sql.js";
import { requireUserId, ensureUserSettings } from "../../utils/user.js";
import { getExpectedMonthlyExpenses, getExpectedMonthlyIncome, calculateMonthlyAmount } from "../../utils/recurring.js";

function isoDowFromUtcDate(d) {
  // 1=Mon ... 7=Sun
  const utcDay = d.getUTCDay();
  return ((utcDay + 6) % 7) + 1;
}

function startOfUtcDay(d) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function addDaysUtc(d, days) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

export async function GET(request) {
  const { userId, error } = await requireUserId(request);
  if (error) return error;

  const settings = await ensureUserSettings(userId);
  const weekStart = settings?.week_start || 1; // 1=Mon

  // Check for custom date range in query params
  const url = new URL(request.url);
  const startDateParam = url.searchParams.get("startDate");
  const endDateParam = url.searchParams.get("endDate");

  let weekStartDate, weekEndDate;

  if (startDateParam && endDateParam) {
    // Use custom date range
    weekStartDate = startOfUtcDay(new Date(startDateParam));
    weekEndDate = startOfUtcDay(new Date(endDateParam));
    // Add one day to endDate to make it inclusive
    weekEndDate = addDaysUtc(weekEndDate, 1);
  } else {
    // Use current week logic
    const now = new Date();
    const isoDow = isoDowFromUtcDate(now);
    const daysSinceStart = (isoDow - weekStart + 7) % 7;
    weekStartDate = startOfUtcDay(addDaysUtc(now, -daysSinceStart));
    weekEndDate = addDaysUtc(weekStartDate, 7);
  }

  const [spentRows, incomeRows, dayRows, categoryRows] = await sql.transaction((txn) => [
    txn(
      "SELECT COALESCE(SUM(amount_cents), 0) AS spent_cents FROM public.expenses WHERE user_id = $1 AND occurred_at >= $2 AND occurred_at < $3 AND type = 'expense'",
      [userId, weekStartDate.toISOString(), weekEndDate.toISOString()],
    ),
    txn(
      "SELECT COALESCE(SUM(amount_cents), 0) AS income_cents FROM public.expenses WHERE user_id = $1 AND occurred_at >= $2 AND occurred_at < $3 AND type = 'income'",
      [userId, weekStartDate.toISOString(), weekEndDate.toISOString()],
    ),
    txn(
      "SELECT date_trunc('day', occurred_at) AS day, COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_cents ELSE 0 END), 0) AS expense_cents, COALESCE(SUM(CASE WHEN type = 'income' THEN amount_cents ELSE 0 END), 0) AS income_cents FROM public.expenses WHERE user_id = $1 AND occurred_at >= $2 AND occurred_at < $3 GROUP BY 1 ORDER BY 1",
      [userId, weekStartDate.toISOString(), weekEndDate.toISOString()],
    ),
    txn(
      "SELECT category, COALESCE(SUM(amount_cents), 0) AS total_cents FROM public.expenses WHERE user_id = $1 AND occurred_at >= $2 AND occurred_at < $3 AND type = 'expense' GROUP BY category ORDER BY total_cents DESC",
      [userId, weekStartDate.toISOString(), weekEndDate.toISOString()],
    ),
  ]);

  const spentCents = Number(spentRows?.[0]?.spent_cents || 0);
  const incomeCents = Number(incomeRows?.[0]?.income_cents || 0);
  const budgetCents = Number(settings?.weekly_budget_cents || 0);

  // Get expected weekly amounts from recurring items (monthly / 4.33)
  const expectedMonthlyExpenses = await getExpectedMonthlyExpenses(userId);
  const expectedMonthlyIncome = await getExpectedMonthlyIncome(userId);
  const expectedWeeklyExpenses = Math.round(expectedMonthlyExpenses / 4.33);
  const expectedWeeklyIncome = Math.round(expectedMonthlyIncome / 4.33);

  const dayExpenses = new Map();
  const dayIncome = new Map();
  for (const row of dayRows || []) {
    const key = new Date(row.day).toISOString().slice(0, 10);
    dayExpenses.set(key, Number(row.expense_cents || 0));
    dayIncome.set(key, Number(row.income_cents || 0));
  }

  // Calculate number of days in the range
  const daysDiff = Math.ceil((weekEndDate - weekStartDate) / (1000 * 60 * 60 * 24));
  const numDays = Math.min(daysDiff, 30); // Cap at 30 days for performance

  const dayBuckets = [];
  for (let i = 0; i < numDays; i++) {
    const day = addDaysUtc(weekStartDate, i);
    if (day >= weekEndDate) break;
    const key = day.toISOString().slice(0, 10);
    const label = day.toLocaleDateString(undefined, {
      weekday: "short",
      timeZone: "UTC",
    });
    dayBuckets.push({ 
      day: key, 
      label, 
      total_cents: dayExpenses.get(key) || 0,
      expense_cents: dayExpenses.get(key) || 0,
      income_cents: dayIncome.get(key) || 0,
    });
  }

  const categoryBuckets = (categoryRows || []).map((r) => ({
    category: r.category,
    total_cents: Number(r.total_cents || 0),
  }));

  const netBalanceCents = incomeCents - spentCents;
  const spendingPercentOfIncome = incomeCents > 0 ? Math.round((spentCents / incomeCents) * 100) : null;
  const spendingPercentOfBudget = budgetCents > 0 ? Math.round((spentCents / budgetCents) * 100) : null;

  // Calculate days elapsed in the period for pace calculations
  const now = new Date();
  const daysElapsed = Math.max(1, Math.min(Math.ceil((now - weekStartDate) / (1000 * 60 * 60 * 24)), daysDiff));
  const daysTotal = Math.ceil((weekEndDate - weekStartDate) / (1000 * 60 * 60 * 24));
  
  // Calculate projected spending based on current pace
  const dailyAverage = spentCents / daysElapsed;
  const projectedSpending = Math.round(dailyAverage * daysTotal);

  return Response.json({
    week_start: weekStartDate.toISOString(),
    week_end: weekEndDate.toISOString(),
    spent_cents: spentCents,
    income_cents: incomeCents,
    net_balance_cents: netBalanceCents,
    spending_percent_of_income: spendingPercentOfIncome,
    spending_percent_of_budget: spendingPercentOfBudget,
    budget_cents: budgetCents,
    remaining_cents: Math.max(budgetCents - spentCents, 0),
    expected_weekly_expenses_cents: expectedWeeklyExpenses,
    expected_weekly_income_cents: expectedWeeklyIncome,
    projected_spending_cents: projectedSpending,
    days_elapsed: daysElapsed,
    days_total: daysTotal,
    day_buckets: dayBuckets,
    category_buckets: categoryBuckets,
  });
}

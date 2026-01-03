import sql from "@/app/api/utils/sql";
import { ensureDeviceSettings, requireDeviceId } from "@/app/api/utils/device";
import { getExpectedMonthlyExpenses, getExpectedMonthlyIncome } from "@/app/api/utils/recurring";

function startOfUtcDay(d) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function startOfUtcMonth(date) {
  const x = new Date(date);
  x.setUTCDate(1);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function addMonthsUtc(d, months) {
  const x = new Date(d);
  x.setUTCMonth(x.getUTCMonth() + months);
  return x;
}

export async function GET(request) {
  const { deviceId, error } = requireDeviceId(request);
  if (error) return error;

  const settings = await ensureDeviceSettings(deviceId);

  // Check for custom date range in query params
  const url = new URL(request.url);
  const startDateParam = url.searchParams.get("startDate");
  const endDateParam = url.searchParams.get("endDate");

  let monthStartDate, monthEndDate;

  if (startDateParam && endDateParam) {
    // Use custom date range
    monthStartDate = startOfUtcDay(new Date(startDateParam));
    monthEndDate = startOfUtcDay(new Date(endDateParam));
    // Add one day to endDate to make it inclusive
    monthEndDate = new Date(monthEndDate.getTime() + 24 * 60 * 60 * 1000);
  } else {
    // Use current month logic
    const now = new Date();
    monthStartDate = startOfUtcMonth(now);
    monthEndDate = addMonthsUtc(monthStartDate, 1);
  }

  const [spentRows, incomeRows, categoryRows] = await sql.transaction((txn) => [
    txn(
      "SELECT COALESCE(SUM(amount_cents), 0) AS spent_cents FROM public.expenses WHERE device_id = $1 AND occurred_at >= $2 AND occurred_at < $3 AND type = 'expense'",
      [deviceId, monthStartDate.toISOString(), monthEndDate.toISOString()],
    ),
    txn(
      "SELECT COALESCE(SUM(amount_cents), 0) AS income_cents FROM public.expenses WHERE device_id = $1 AND occurred_at >= $2 AND occurred_at < $3 AND type = 'income'",
      [deviceId, monthStartDate.toISOString(), monthEndDate.toISOString()],
    ),
    txn(
      "SELECT category, COALESCE(SUM(amount_cents), 0) AS total_cents FROM public.expenses WHERE device_id = $1 AND occurred_at >= $2 AND occurred_at < $3 AND type = 'expense' GROUP BY category ORDER BY total_cents DESC",
      [deviceId, monthStartDate.toISOString(), monthEndDate.toISOString()],
    ),
  ]);

  const spentCents = Number(spentRows?.[0]?.spent_cents || 0);
  const incomeCents = Number(incomeRows?.[0]?.income_cents || 0);

  // Get budget based on period preference
  const budgetPeriod = settings?.budget_period || 'weekly';
  let budgetCents = 0;
  
  if (budgetPeriod === 'monthly') {
    budgetCents = Number(settings?.monthly_budget_cents || 0);
  } else {
    // Convert weekly budget to monthly (4.33 weeks per month)
    const weeklyBudget = Number(settings?.weekly_budget_cents || 0);
    budgetCents = Math.round(weeklyBudget * 4.33);
  }

  // Get expected amounts from recurring items
  const expectedMonthlyExpenses = await getExpectedMonthlyExpenses(deviceId);
  const expectedMonthlyIncome = await getExpectedMonthlyIncome(deviceId);

  const categoryBuckets = (categoryRows || []).map((r) => ({
    category: r.category,
    total_cents: Number(r.total_cents || 0),
  }));

  const netBalanceCents = incomeCents - spentCents;
  const spendingPercentOfIncome = incomeCents > 0 ? Math.round((spentCents / incomeCents) * 100) : null;
  const spendingPercentOfBudget = budgetCents > 0 ? Math.round((spentCents / budgetCents) * 100) : null;

  // Calculate days elapsed in the month for pace calculations
  const now = new Date();
  const monthStartMs = monthStartDate.getTime();
  const monthEndMs = monthEndDate.getTime();
  const nowMs = now.getTime();
  const daysElapsed = Math.max(1, Math.min(Math.ceil((nowMs - monthStartMs) / (1000 * 60 * 60 * 24)), 31));
  const daysTotal = Math.ceil((monthEndMs - monthStartMs) / (1000 * 60 * 60 * 24));
  
  // Calculate projected spending based on current pace
  const dailyAverage = spentCents / daysElapsed;
  const projectedSpending = Math.round(dailyAverage * daysTotal);

  return Response.json({
    month_start: monthStartDate.toISOString(),
    month_end: monthEndDate.toISOString(),
    spent_cents: spentCents,
    income_cents: incomeCents,
    net_balance_cents: netBalanceCents,
    spending_percent_of_income: spendingPercentOfIncome,
    spending_percent_of_budget: spendingPercentOfBudget,
    budget_cents: budgetCents,
    expected_monthly_expenses_cents: expectedMonthlyExpenses,
    expected_monthly_income_cents: expectedMonthlyIncome,
    remaining_cents: Math.max(budgetCents - spentCents, 0),
    projected_spending_cents: projectedSpending,
    days_elapsed: daysElapsed,
    days_total: daysTotal,
    category_buckets: categoryBuckets,
  });
}


import sql from "../utils/sql.js";
import { requireUserId, ensureUserSettings } from "../utils/user.js";

export async function GET(request) {
  const { userId, error } = await requireUserId(request);
  if (error) return error;

  const row = await ensureUserSettings(userId);
  return Response.json(row);
}

export async function PUT(request) {
  const { userId, error } = await requireUserId(request);
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  
  // Backward compatible: weekly_budget_cents can still be set
  const weekly_budget_cents = body.weekly_budget_cents !== undefined
    ? (Number.isFinite(body.weekly_budget_cents) ? body.weekly_budget_cents : null)
    : undefined; // undefined means don't update this field

  // New fields: monthly_budget_cents and budget_period
  const monthly_budget_cents = body.monthly_budget_cents !== undefined
    ? (Number.isFinite(body.monthly_budget_cents) ? body.monthly_budget_cents : null)
    : undefined;

  const budget_period = body.budget_period !== undefined
    ? (body.budget_period === 'weekly' || body.budget_period === 'monthly' ? body.budget_period : 'weekly')
    : undefined;

  // Validation: if provided, must be non-negative
  if (weekly_budget_cents !== undefined && (weekly_budget_cents === null || weekly_budget_cents < 0)) {
    return Response.json(
      { error: "weekly_budget_cents must be a non-negative number" },
      { status: 400 },
    );
  }

  if (monthly_budget_cents !== undefined && monthly_budget_cents !== null && monthly_budget_cents < 0) {
    return Response.json(
      { error: "monthly_budget_cents must be a non-negative number or null" },
      { status: 400 },
    );
  }

  await ensureUserSettings(userId);

  // Build dynamic UPDATE query based on what fields are provided
  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  if (weekly_budget_cents !== undefined) {
    setClauses.push(`weekly_budget_cents = $${paramIndex++}`);
    values.push(weekly_budget_cents);
  }

  if (monthly_budget_cents !== undefined) {
    setClauses.push(`monthly_budget_cents = $${paramIndex++}`);
    values.push(monthly_budget_cents);
  }

  if (budget_period !== undefined) {
    setClauses.push(`budget_period = $${paramIndex++}`);
    values.push(budget_period);
  }

  if (setClauses.length === 0) {
    // No fields to update, just return current settings
    const rows = await sql(
      "SELECT * FROM public.device_settings WHERE user_id = $1 LIMIT 1",
      [userId],
    );
    return Response.json(rows[0] || {});
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(userId);

  const query = `UPDATE public.device_settings SET ${setClauses.join(", ")} WHERE user_id = $${paramIndex} RETURNING *`;

  const rows = await sql(query, values);

  return Response.json(rows[0]);
}

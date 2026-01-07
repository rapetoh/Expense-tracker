import sql from "../utils/sql";
import { requireUserId, ensureUserSettings } from "../utils/user";
import normalizeVendor from "../utils/normalizeVendor";

export async function GET(request) {
  const { userId, error } = await requireUserId(request);
  if (error) return error;

  await ensureUserSettings(userId);

  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const limit = Math.max(1, Math.min(Number(limitParam || 50) || 50, 200));

  const items = await sql(
    "SELECT id, user_id, amount_cents, vendor, category, note, occurred_at, created_at, type, is_recurring, recurrence_frequency FROM public.expenses WHERE user_id = $1 ORDER BY occurred_at DESC, id DESC LIMIT $2",
    [userId, limit],
  );

  // Convert Date objects to ISO strings for JSON serialization
  const serializedItems = items.map((item) => ({
    ...item,
    occurred_at: item.occurred_at instanceof Date ? item.occurred_at.toISOString() : item.occurred_at,
    created_at: item.created_at instanceof Date ? item.created_at.toISOString() : item.created_at,
    is_recurring: item.is_recurring || false,
    recurrence_frequency: item.recurrence_frequency || null,
  }));

  return Response.json({ items: serializedItems });
}

export async function POST(request) {
  const { userId, error } = await requireUserId(request);
  if (error) return error;

  await ensureUserSettings(userId);

  const body = await request.json().catch(() => ({}));

  const amount_cents = Number.isFinite(body.amount_cents)
    ? body.amount_cents
    : null;
  const category = body.category ? String(body.category).trim() : null;
  const vendor = body.vendor ? String(body.vendor).trim() : null;
  const note = body.note ? String(body.note).trim() : null;
  const type = body.type && (body.type === 'expense' || body.type === 'income') 
    ? body.type 
    : 'expense'; // Default to 'expense' for backward compatibility
  const is_recurring = body.is_recurring === true ? true : false;
  const recurrence_frequency = (is_recurring && body.recurrence_frequency && 
    ['weekly', 'biweekly', 'monthly', 'quarterly', 'annually'].includes(body.recurrence_frequency))
    ? body.recurrence_frequency 
    : null;
  const occurred_at = body.occurred_at
    ? new Date(body.occurred_at).toISOString()
    : new Date().toISOString();

  if (amount_cents === null || amount_cents <= 0) {
    return Response.json(
      { error: "amount_cents must be a positive number" },
      { status: 400 },
    );
  }
  if (!category) {
    return Response.json({ error: "category is required" }, { status: 400 });
  }

  const vendorKey = normalizeVendor(vendor);

  const result = await sql.transaction((txn) => {
    const queries = [];

    queries.push(
      txn(
        "INSERT INTO public.expenses (user_id, amount_cents, vendor, category, note, occurred_at, type, is_recurring, recurrence_frequency) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, user_id, amount_cents, vendor, category, note, occurred_at, created_at, type, is_recurring, recurrence_frequency",
        [userId, amount_cents, vendor, category, note, occurred_at, type, is_recurring, recurrence_frequency],
      ),
    );

    if (vendorKey) {
      queries.push(
        txn(
          "INSERT INTO public.vendor_category_map (user_id, vendor_key, category, updated_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (user_id, vendor_key) DO UPDATE SET category = EXCLUDED.category, updated_at = NOW() RETURNING user_id",
          [userId, vendorKey, category],
        ),
      );
    }

    return queries;
  });

  const insertedRows = result[0];
  const row = insertedRows[0];
  
  // Convert Date objects to ISO strings for JSON serialization
  const serializedRow = {
    ...row,
    occurred_at: row.occurred_at instanceof Date ? row.occurred_at.toISOString() : row.occurred_at,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
  
  return Response.json(serializedRow);
}

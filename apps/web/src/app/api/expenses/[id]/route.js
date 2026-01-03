import sql from "@/app/api/utils/sql";
import { requireDeviceId } from "@/app/api/utils/device";

export async function DELETE(request, { params: { id } }) {
  const { deviceId, error } = requireDeviceId(request);
  if (error) return error;

  const parsedId = Number(id);
  if (!Number.isFinite(parsedId)) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }

  await sql("DELETE FROM public.expenses WHERE id = $1 AND device_id = $2", [
    parsedId,
    deviceId,
  ]);
  return Response.json({ ok: true });
}

export async function GET(request, { params: { id } }) {
  const { deviceId, error } = requireDeviceId(request);
  if (error) return error;

  const parsedId = Number(id);
  if (!Number.isFinite(parsedId)) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }

  const rows = await sql(
    "SELECT id, device_id, amount_cents, vendor, category, note, occurred_at, created_at, type, is_recurring, recurrence_frequency FROM public.expenses WHERE id = $1 AND device_id = $2 LIMIT 1",
    [parsedId, deviceId],
  );

  if (!rows[0]) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const row = rows[0];
  return Response.json({
    ...row,
    is_recurring: row.is_recurring || false,
    recurrence_frequency: row.recurrence_frequency || null,
  });
}

export async function PUT(request, { params: { id } }) {
  const { deviceId, error } = requireDeviceId(request);
  if (error) return error;

  const parsedId = Number(id);
  if (!Number.isFinite(parsedId)) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));

  const setClauses = [];
  const values = [];
  let idx = 1;

  if (Number.isFinite(body.amount_cents) && body.amount_cents > 0) {
    setClauses.push(`amount_cents = $${idx++}`);
    values.push(body.amount_cents);
  }
  if (body.vendor !== undefined) {
    setClauses.push(`vendor = $${idx++}`);
    values.push(body.vendor ? String(body.vendor).trim() : null);
  }
  if (body.category) {
    setClauses.push(`category = $${idx++}`);
    values.push(String(body.category).trim());
  }
  if (body.note !== undefined) {
    setClauses.push(`note = $${idx++}`);
    values.push(body.note ? String(body.note).trim() : null);
  }
  if (body.occurred_at) {
    setClauses.push(`occurred_at = $${idx++}`);
    values.push(new Date(body.occurred_at).toISOString());
  }
  if (body.type && (body.type === 'expense' || body.type === 'income')) {
    setClauses.push(`type = $${idx++}`);
    values.push(body.type);
  }
  if (body.is_recurring !== undefined) {
    setClauses.push(`is_recurring = $${idx++}`);
    values.push(body.is_recurring === true);
  }
  if (body.recurrence_frequency !== undefined) {
    if (body.recurrence_frequency === null || (body.recurrence_frequency && ['weekly', 'biweekly', 'monthly', 'quarterly', 'annually'].includes(body.recurrence_frequency))) {
      setClauses.push(`recurrence_frequency = $${idx++}`);
      values.push(body.recurrence_frequency);
    }
  }

  if (setClauses.length === 0) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  values.push(parsedId);
  values.push(deviceId);

  const query = `UPDATE public.expenses SET ${setClauses.join(", ")} WHERE id = $${idx++} AND device_id = $${idx++} RETURNING id, device_id, amount_cents, vendor, category, note, occurred_at, created_at, type, is_recurring, recurrence_frequency`;

  const rows = await sql(query, values);
  if (!rows[0]) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const row = rows[0];
  return Response.json({
    ...row,
    is_recurring: row.is_recurring || false,
    recurrence_frequency: row.recurrence_frequency || null,
  });
}

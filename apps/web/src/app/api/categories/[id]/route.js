import sql from "@/app/api/utils/sql";
import { requireDeviceId } from "@/app/api/utils/device";

export async function GET(request, { params: { id } }) {
  const { deviceId, error } = requireDeviceId(request);
  if (error) return error;

  const parsedId = Number(id);
  if (!Number.isFinite(parsedId)) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }

  const rows = await sql(
    "SELECT id, category_name, icon, color, type FROM public.custom_categories WHERE id = $1 AND device_id = $2 LIMIT 1",
    [parsedId, deviceId],
  );

  if (!rows[0]) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(rows[0]);
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

  if (body.category_name) {
    const categoryName = String(body.category_name).trim();
    if (categoryName) {
      setClauses.push(`category_name = $${idx++}`);
      values.push(categoryName);
    }
  }
  if (body.icon !== undefined) {
    setClauses.push(`icon = $${idx++}`);
    values.push(body.icon ? String(body.icon).trim() : "✨");
  }
  if (body.color !== undefined) {
    setClauses.push(`color = $${idx++}`);
    values.push(body.color ? String(body.color).trim() : "#F6F6F6");
  }
  if (body.type && (body.type === 'expense' || body.type === 'income')) {
    setClauses.push(`type = $${idx++}`);
    values.push(body.type);
  }

  if (setClauses.length === 0) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  values.push(parsedId);
  values.push(deviceId);

  const query = `UPDATE public.custom_categories SET ${setClauses.join(", ")} WHERE id = $${idx++} AND device_id = $${idx++} RETURNING id, category_name, icon, color, type`;

  const rows = await sql(query, values);
  if (!rows[0]) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(rows[0]);
}

export async function DELETE(request, { params: { id } }) {
  const { deviceId, error } = requireDeviceId(request);
  if (error) return error;

  const parsedId = Number(id);
  if (!Number.isFinite(parsedId)) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }

  const rows = await sql(
    "DELETE FROM public.custom_categories WHERE id = $1 AND device_id = $2 RETURNING id",
    [parsedId, deviceId],
  );

  if (rows.length === 0) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ success: true, id: parsedId });
}


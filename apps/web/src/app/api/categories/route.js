import sql from "../utils/sql";
import { requireUserId } from "../utils/user";

export async function GET(request) {
  const { userId, error } = await requireUserId(request);
  if (error) return error;

  const url = new URL(request.url);
  const typeParam = url.searchParams.get("type"); // Optional filter by type

  let query = "SELECT id, category_name, icon, color, type FROM public.custom_categories WHERE user_id = $1";
  const params = [userId];
  
  if (typeParam && (typeParam === 'expense' || typeParam === 'income')) {
    query += " AND type = $2 ORDER BY created_at ASC";
    params.push(typeParam);
  } else {
    query += " ORDER BY created_at ASC";
  }

  const rows = await sql(query, params);

  return Response.json({ categories: rows || [] });
}

export async function POST(request) {
  const { userId, error } = await requireUserId(request);
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const categoryName = body.category_name ? String(body.category_name).trim() : null;
  const icon = body.icon ? String(body.icon).trim() : "✨";
  const color = body.color ? String(body.color).trim() : "#F6F6F6";
  const type = body.type && (body.type === 'expense' || body.type === 'income') ? body.type : 'expense';

  if (!categoryName) {
    return Response.json(
      { error: "category_name is required" },
      { status: 400 },
    );
  }

  // Check if category already exists (same name and type)
  const existing = await sql(
    "SELECT category_name FROM public.custom_categories WHERE user_id = $1 AND LOWER(category_name) = LOWER($2) AND type = $3 LIMIT 1",
    [userId, categoryName, type],
  );

  if (existing.length > 0) {
    return Response.json(
      { error: "Category already exists" },
      { status: 400 },
    );
  }

  const rows = await sql(
    "INSERT INTO public.custom_categories (user_id, category_name, icon, color, type) VALUES ($1, $2, $3, $4, $5) RETURNING id, category_name, icon, color, type",
    [userId, categoryName, icon, color, type],
  );

  return Response.json(rows[0]);
}

// DELETE is now handled in [id]/route.js
export async function DELETE(request) {
  return Response.json(
    { error: "Use DELETE /api/categories/:id instead" },
    { status: 400 },
  );
}

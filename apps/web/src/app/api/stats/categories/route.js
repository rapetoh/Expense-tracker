import sql from "@/app/api/utils/sql";
import { requireUserId } from "@/app/api/utils/user";

export async function GET(request) {
  const { userId, error } = await requireUserId(request);
  if (error) return error;

  const url = new URL(request.url);
  const typeParam = url.searchParams.get("type"); // Optional: 'expense' or 'income'
  const type = typeParam && (typeParam === 'expense' || typeParam === 'income') ? typeParam : 'expense';

  const categoryRows = await sql(
    "SELECT category, COALESCE(SUM(amount_cents), 0) AS total_cents FROM public.expenses WHERE user_id = $1 AND type = $2 GROUP BY category ORDER BY total_cents DESC",
    [userId, type],
  );

  const categoryBuckets = (categoryRows || []).map((r) => ({
    category: r.category,
    total_cents: Number(r.total_cents || 0),
  }));

  return Response.json({ category_buckets: categoryBuckets });
}
